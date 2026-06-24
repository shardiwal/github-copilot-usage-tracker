/**
 * HookBridge — bridges VS Code Agent Hooks → extension database.
 *
 * On start-up the bridge:
 *  1. Spawns a local HTTP server bound to 127.0.0.1 on a random port.
 *  2. Writes { port, token } to ~/.copilot-tracker/server.json (mode 0o600)
 *     so the hook scripts can find it.
 *  3. Installs hook scripts into ~/.copilot-tracker/ and a user-level hook
 *     config into ~/.copilot/hooks/copilot-tracker.json.
 *
 * When VS Code fires a UserPromptSubmit hook event the installed shell script
 * POSTs the JSON payload here.  The bridge estimates input tokens from the
 * prompt text and persists a usage record to the database so the dashboard
 * shows Ask / Agent mode activity automatically.
 *
 * Security:
 *  - Server only listens on the loopback interface (127.0.0.1).
 *  - Every request must supply the random per-session token in the
 *    x-tracker-token header.  Requests without a valid token are rejected
 *    with HTTP 401.
 */

import * as http from "http";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { tokenEstimator } from "../tracker/tokenEstimator";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";
import { calculateCost } from "../tracker/costCalculator";
import { DashboardProvider } from "../webview/dashboardProvider";

/** Directory where runtime files (server.json, hook scripts) are stored. */
export const TRACKER_DIR = path.join(os.homedir(), ".copilot-tracker");

/** User-level VS Code hook configuration directory. */
const COPILOT_HOOKS_DIR = path.join(os.homedir(), ".copilot", "hooks");

const SERVER_FILE = path.join(TRACKER_DIR, "server.json");
const HOOKS_CONFIG_FILE = path.join(COPILOT_HOOKS_DIR, "copilot-tracker.json");

interface ServerConfig {
  port: number;
  token: string;
}

export class HookBridge {
  private server: http.Server | null = null;
  private config: ServerConfig = { port: 0, token: "" };

  /** Wall-clock ms at the time UserPromptSubmit was received, keyed by sessionId. */
  private sessionStartMs = new Map<string, number>();
  /** Accumulated estimated output tokens from PostToolUse, keyed by sessionId. */
  private sessionOutputTokens = new Map<string, number>();
  /** Model resolved at UserPromptSubmit time, keyed by sessionId. */
  private sessionModel = new Map<string, string>();

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolve the active Copilot model.
   *
   * The VS Code hooks API does not include a model field in any hook payload,
   * so we read it from the VS Code LM API instead.
   */
  private async getActiveModel(): Promise<string> {
    try {
      // Prefer the explicitly configured agent model setting when present.
      const cfg = vscode.workspace.getConfiguration("github.copilot.chat");
      const configured = cfg.get<string>("agent.model");
      if (configured) {
        return configured;
      }
    } catch {
      // getConfiguration can throw outside an extension host — ignore.
    }

    try {
      const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
      if (models.length > 0) {
        return models[0].id;
      }
    } catch {
      // LM API not available in this host — ignore.
    }

    return "copilot-agent";
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async start(
    database: Database,
    dashboardProvider?: DashboardProvider
  ): Promise<void> {
    this.config = {
      port: 0,
      token: crypto.randomBytes(32).toString("hex"),
    };

    this.server = http.createServer((req, res) =>
      this.handleRequest(req, res, database, dashboardProvider)
    );

    await new Promise<void>((resolve, reject) => {
      this.server!.on("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });

    this.config.port = (this.server.address() as { port: number }).port;
    logger.info("HookBridge: HTTP server listening", { port: this.config.port });

    // Persist connection details for the hook scripts
    try {
      fs.mkdirSync(TRACKER_DIR, { recursive: true });
      fs.writeFileSync(SERVER_FILE, JSON.stringify(this.config), { mode: 0o600 });
      logger.info("HookBridge: server.json written", { path: SERVER_FILE });
    } catch (err) {
      logger.error("HookBridge: failed to write server.json", err);
      throw err;
    }

    try {
      this.installHooks();
    } catch (err) {
      // Hook installation failure is non-fatal — the HTTP server is still up
      // and will serve any hook scripts already in place from a previous run.
      logger.error("HookBridge: failed to install hooks (non-fatal)", err);
    }

    logger.info("HookBridge started", { port: this.config.port });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    // Remove the server file so stale hook scripts don't attempt connections
    try {
      fs.unlinkSync(SERVER_FILE);
    } catch {
      // file may not exist — that is fine
    }
    logger.info("HookBridge stopped");
  }

  // ─── HTTP handler ──────────────────────────────────────────────────────────

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    database: Database,
    dashboardProvider?: DashboardProvider
  ): void {
    if (req.method !== "POST" || req.url !== "/hook") {
      res.writeHead(404);
      res.end();
      return;
    }

    // Validate the per-session auth token
    if (req.headers["x-tracker-token"] !== this.config.token) {
      res.writeHead(401);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const event = JSON.parse(body);
        await this.processEvent(event, database, dashboardProvider);
        res.writeHead(200);
        res.end("OK");
      } catch (err) {
        logger.error("HookBridge: failed to process event", err);
        res.writeHead(400);
        res.end("Bad Request");
      }
    });
  }

  // ─── Event processing ──────────────────────────────────────────────────────

  private async processEvent(
    event: Record<string, unknown>,
    database: Database,
    dashboardProvider?: DashboardProvider
  ): Promise<void> {
    const hookName = String(event["hook_event_name"] ?? "");

    if (hookName === "UserPromptSubmit") {
      await this.onUserPromptSubmit(event, database, dashboardProvider);
    } else if (hookName === "PostToolUse") {
      this.onPostToolUse(event);
    } else if (hookName === "Stop") {
      await this.onStop(event, database, dashboardProvider);
    }
  }

  // ─── UserPromptSubmit ──────────────────────────────────────────────────────

  private async onUserPromptSubmit(
    event: Record<string, unknown>,
    database: Database,
    dashboardProvider?: DashboardProvider
  ): Promise<void> {
    const prompt = String(event["prompt"] ?? "");
    const workspace = String(event["cwd"] ?? "unknown");
    const sessionId = String(
      event["session_id"] ?? sessionManager.getCurrentSessionId()
    );
    const timestamp = String(event["timestamp"] ?? DateUtils.toISOString());
    // The hooks API does not supply a model field — resolve it from VS Code.
    const model = await this.getActiveModel();

    // Cache the model for the Stop handler (which also has no model in its payload).
    this.sessionModel.set(sessionId, model);

    const inputTokens = tokenEstimator.estimatePromptTokens(prompt);
    const cost = calculateCost(model, inputTokens, 0);

    // Record session start so Stop can compute duration.
    this.sessionStartMs.set(sessionId, Date.now());
    // Reset any accumulated output tokens from a previous turn in this session.
    this.sessionOutputTokens.set(sessionId, 0);

    sessionManager.recordTokenUsage(inputTokens);

    try {
      const recordId = await database.addUsageRecord({
        timestamp,
        workspace,
        language: "unknown",
        file: "unknown",
        prompt,
        response: "",
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        duration: 0,
        sessionId,
        model,
        cost,
      });

      logger.info("HookBridge: recorded usage", { recordId, inputTokens });
      dashboardProvider?.refresh();
    } catch (err) {
      logger.error("HookBridge: failed to save record", err);
    }
  }

  // ─── PostToolUse ───────────────────────────────────────────────────────────

  /**
   * Accumulate estimated output tokens from tool responses.
   * tool_response text is what the model receives back from each tool call;
   * counting those tokens gives a reasonable lower-bound on output activity
   * until a dedicated response hook is available in the VS Code hooks API.
   */
  private onPostToolUse(event: Record<string, unknown>): void {
    const sessionId = String(
      event["session_id"] ?? sessionManager.getCurrentSessionId()
    );
    const toolResponse = String(event["tool_response"] ?? "");
    const toolName = String(event["tool_name"] ?? "unknown");

    const tokens = tokenEstimator.estimatePromptTokens(toolResponse);
    const prev = this.sessionOutputTokens.get(sessionId) ?? 0;
    this.sessionOutputTokens.set(sessionId, prev + tokens);

    logger.debug("HookBridge: PostToolUse", { sessionId, toolName, tokens, total: prev + tokens });
  }

  // ─── Stop ──────────────────────────────────────────────────────────────────

  /**
   * Fired when the agent session ends.  At this point we have:
   *  - wall-clock duration  (sessionStartMs)
   *  - accumulated output tokens from all tool responses  (sessionOutputTokens)
   * Both are written back to the record that was created on UserPromptSubmit.
   */
  private async onStop(
    event: Record<string, unknown>,
    database: Database,
    dashboardProvider?: DashboardProvider
  ): Promise<void> {
    const sessionId = String(
      event["session_id"] ?? sessionManager.getCurrentSessionId()
    );
    // Re-use the model recorded at UserPromptSubmit time; the Stop payload
    // also has no model field in the VS Code hooks API.
    const model = this.sessionModel.get(sessionId) ?? await this.getActiveModel();

    const startMs = this.sessionStartMs.get(sessionId);
    const duration = startMs !== undefined ? Date.now() - startMs : 0;
    const outputTokens = this.sessionOutputTokens.get(sessionId) ?? 0;

    // Clean up in-memory state
    this.sessionStartMs.delete(sessionId);
    this.sessionOutputTokens.delete(sessionId);
    this.sessionModel.delete(sessionId);

    if (outputTokens === 0 && duration === 0) {
      // Nothing new to write — session may have had no UserPromptSubmit recorded.
      return;
    }

    try {
      // Re-fetch the existing record's inputTokens to compute totalTokens correctly.
      const records = await database.getUsageRecords({ sessionId } as any);
      const latest = records[records.length - 1];
      if (!latest) return;

      const totalTokens = latest.inputTokens + outputTokens;
      const cost = calculateCost(model, latest.inputTokens, outputTokens);

      await database.updateUsageRecordBySession(sessionId, outputTokens, totalTokens, duration, cost);

      sessionManager.recordTokenUsage(outputTokens);
      logger.info("HookBridge: session finalised", { sessionId, outputTokens, duration });
      dashboardProvider?.refresh();
    } catch (err) {
      logger.error("HookBridge: failed to finalise session", err);
    }
  }

  // ─── Hook installation ─────────────────────────────────────────────────────

  private installHooks(): void {
    // Hook scripts
    const psScript = path.join(TRACKER_DIR, "tracker-hook.ps1");
    const shScript = path.join(TRACKER_DIR, "tracker-hook.sh");

    fs.writeFileSync(psScript, this.buildPowerShellScript());
    fs.writeFileSync(shScript, this.buildBashScript(), { mode: 0o755 });

    // User-level hook config (applies to every workspace automatically)
    fs.mkdirSync(COPILOT_HOOKS_DIR, { recursive: true });

    const hookEntry = {
      type: "command",
      command: `bash "${shScript.replace(/\\/g, "/")}"`,
      windows: `powershell -ExecutionPolicy Bypass -File "${psScript}"`,
      timeout: 5,
    };

    const config = {
      hooks: {
        // Fired when the user submits a prompt — capture input tokens.
        UserPromptSubmit: [hookEntry],
        // Fired after every tool call completes — accumulate output tokens
        // from tool responses as a proxy for model output activity.
        PostToolUse: [hookEntry],
        // Fired when the agent session ends — finalise duration and output tokens.
        Stop: [hookEntry],
      },
    };

    fs.writeFileSync(HOOKS_CONFIG_FILE, JSON.stringify(config, null, 2));
    logger.info("HookBridge: hooks installed", { COPILOT_HOOKS_DIR });
  }

  // ─── Script templates ──────────────────────────────────────────────────────

  private buildPowerShellScript(): string {
    return `# Copilot Tracker – UserPromptSubmit hook (PowerShell)
# Auto-generated by the Copilot Usage Tracker extension. Do not edit manually.
$serverFile = Join-Path $env:USERPROFILE ".copilot-tracker\\server.json"
if (-not (Test-Path $serverFile)) { exit 0 }
try {
    $server   = Get-Content $serverFile -Raw | ConvertFrom-Json
    $payload  = $input | Out-String
    $null     = Invoke-RestMethod \`
                    -Uri         "http://127.0.0.1:$($server.port)/hook" \`
                    -Method      Post \`
                    -Body        $payload \`
                    -ContentType "application/json" \`
                    -Headers     @{ "x-tracker-token" = $server.token }
} catch { }
exit 0
`;
  }

  private buildBashScript(): string {
    // Use Python's json module so jq is not required
    return `#!/usr/bin/env bash
# Copilot Tracker – UserPromptSubmit hook (bash)
# Auto-generated by the Copilot Usage Tracker extension. Do not edit manually.
SERVER_FILE="$HOME/.copilot-tracker/server.json"
[ -f "$SERVER_FILE" ] || exit 0

# Parse server.json without requiring jq
PORT=$(python3 -c "import sys,json; d=json.load(open('$SERVER_FILE')); print(d['port'])" 2>/dev/null)
TOKEN=$(python3 -c "import sys,json; d=json.load(open('$SERVER_FILE')); print(d['token'])" 2>/dev/null)

[ -z "$PORT" ] && exit 0

INPUT=$(cat)
curl -s -X POST "http://127.0.0.1:\${PORT}/hook" \\
     -H "Content-Type: application/json" \\
     -H "x-tracker-token: \${TOKEN}" \\
     -d "$INPUT" >/dev/null 2>&1 || true
exit 0
`;
  }
}

export const hookBridge = new HookBridge();
