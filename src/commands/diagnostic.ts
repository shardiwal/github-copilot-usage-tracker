/**
 * Diagnostic command to test storage functionality
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";

/**
 * Runs a comprehensive self-test of the extension's core subsystems and
 * displays the results in a dedicated "Copilot Tracker Diagnostics" output
 * channel.
 *
 * @param _context  - The VS Code extension context (unused but required by the
 *   command registration signature).
 * @param database  - The {@link Database} instance to test read/write against.
 * @param statistics - The {@link Statistics} instance used to verify analytics
 *   calculations.
 * @returns A promise that resolves when all diagnostic tests have completed.
 *
 * @remarks
 * The command performs the following tests in order:
 *  1. **Session information** — verifies the session manager is running and
 *     returns valid stats.
 *  2. **Database connection** — confirms the database can be queried.
 *  3. **Record retrieval** — fetches all stored records and previews the last
 *     three.
 *  4. **Statistics calculation** — exercises {@link Statistics.getAnalytics}.
 *  5. **Today's statistics** — calls {@link Statistics.getDailyStats} for the
 *     current date.
 *  6. **Write test** — inserts a labelled diagnostic record and captures the
 *     assigned ID.
 *  7. **Persistence verification** — re-queries the database to confirm the
 *     test record was durably saved.
 *
 * A synthetic record tagged `[DIAGNOSTIC TEST]` is written to the database on
 * every run.  Use the **Clear History** command to remove it afterwards if
 * needed.
 *
 * @example
 * ```typescript
 * // Registered in extension.ts
 * vscode.commands.registerCommand(
 *   'copilot-tracker.diagnostic',
 *   (ctx) => diagnosticCommand(ctx, database, statistics)
 * );
 * ```
 */
/** Result of a single diagnostic step. */
interface StepResult {
  passed: boolean;
  detail?: string;
}

/**
 * Writes a step header to both the output channel and the debug log, then
 * runs `fn`.  On success the step is marked ✓; on failure it is marked ✗ and
 * the error is re-thrown so the outer catch can handle it.
 */
async function runStep(
  outputChannel: vscode.OutputChannel,
  stepNumber: number,
  title: string,
  fn: () => Promise<StepResult>
): Promise<StepResult> {
  const header = `📝 Step ${stepNumber}: ${title}`;
  outputChannel.appendLine(header);
  logger.debug(`[DIAG] → STARTED  step ${stepNumber}: ${title}`);

  try {
    const result = await fn();
    const status = result.passed ? "✓ PASSED" : "⚠ WARNING";
    outputChannel.appendLine(`  ${status}${result.detail ? ` — ${result.detail}` : ""}\n`);
    logger.debug(`[DIAG] ← ${result.passed ? "PASSED " : "WARNING"} step ${stepNumber}: ${title}${result.detail ? ` (${result.detail})` : ""}`);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`  ✗ FAILED — ${msg}\n`);
    logger.error(`[DIAG] ✗ FAILED  step ${stepNumber}: ${title}`, error);
    throw error;
  }
}

export async function diagnosticCommand(
  _context: vscode.ExtensionContext,
  database: Database,
  statistics: Statistics
): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Copilot Tracker Diagnostics");
  outputChannel.clear();
  outputChannel.show();

  const ts = () => new Date().toISOString();

  outputChannel.appendLine("========================================");
  outputChannel.appendLine("📊 COPILOT USAGE TRACKER - DIAGNOSTICS");
  outputChannel.appendLine(`   Started: ${ts()}`);
  outputChannel.appendLine("========================================\n");

  logger.info("[DIAG] ══════════════════════════════════════");
  logger.info("[DIAG] Diagnostic run started");

  const results: Array<{ step: number; title: string; passed: boolean }> = [];

  const track = (step: number, title: string, passed: boolean) =>
    results.push({ step, title, passed });

  try {
    // ── Step 1: Session Info ──────────────────────────────────────────────────
    await runStep(outputChannel, 1, "Session Information", async () => {
      const currentSession = sessionManager.getCurrentSessionId();
      const sessionStats = sessionManager.getSessionStats();

      logger.debug("[DIAG]   session id     :", currentSession);
      logger.debug("[DIAG]   total sessions :", sessionStats.totalSessions);
      logger.debug("[DIAG]   active sessions:", sessionStats.activeSessions);
      logger.debug("[DIAG]   total tokens   :", sessionStats.totalTokens);

      outputChannel.appendLine(`    Session ID           : ${currentSession}`);
      outputChannel.appendLine(`    Total Sessions       : ${sessionStats.totalSessions}`);
      outputChannel.appendLine(`    Active Sessions      : ${sessionStats.activeSessions}`);
      outputChannel.appendLine(`    Total Tokens (sess.) : ${sessionStats.totalTokens}`);
      outputChannel.appendLine(`    Avg Tokens/Session   : ${sessionStats.averageTokensPerSession}`);

      track(1, "Session Information", true);
      return { passed: true };
    });

    // ── Step 2: Database Connection ───────────────────────────────────────────
    await runStep(outputChannel, 2, "Database Connection", async () => {
      logger.debug("[DIAG]   querying 1 record to probe connection…");
      await database.getUsageRecords(undefined, 1);
      logger.debug("[DIAG]   probe query succeeded");

      outputChannel.appendLine("    Connected            : Yes");
      outputChannel.appendLine("    Can query records    : Yes");

      track(2, "Database Connection", true);
      return { passed: true };
    });

    // ── Step 3: Record Retrieval ──────────────────────────────────────────────
    let allRecords: Awaited<ReturnType<Database["getUsageRecords"]>> = [];
    await runStep(outputChannel, 3, "Record Retrieval", async () => {
      logger.debug("[DIAG]   fetching all records…");
      allRecords = await database.getUsageRecords();
      logger.debug("[DIAG]   fetched records count:", allRecords.length);

      outputChannel.appendLine(`    Total records in DB  : ${allRecords.length}`);

      if (allRecords.length > 0) {
        outputChannel.appendLine("    Last 3 records:");
        allRecords.slice(-3).forEach((r, i) => {
          outputChannel.appendLine(`      [${i + 1}] id=${r.id}  tokens=${r.totalTokens}  lang=${r.language}  ${r.timestamp}`);
          logger.debug(`[DIAG]     record[${i + 1}]: id=${r.id} tokens=${r.totalTokens} lang=${r.language} ts=${r.timestamp}`);
        });
      } else {
        outputChannel.appendLine("    ⚠️  No records found — nothing has been tracked yet.");
        logger.debug("[DIAG]   no records in database");
      }

      track(3, "Record Retrieval", true);
      return { passed: true, detail: `${allRecords.length} record(s)` };
    });

    // ── Step 4: Analytics / Statistics ───────────────────────────────────────
    await runStep(outputChannel, 4, "Statistics Calculation", async () => {
      logger.debug("[DIAG]   computing analytics…");
      const analytics = await statistics.getAnalytics();
      logger.debug("[DIAG]   analytics result:", {
        totalRequests: analytics.totalRequests,
        totalTokens: analytics.totalTokens,
        mostActiveWorkspace: analytics.mostActiveWorkspace,
        mostActiveLanguage: analytics.mostActiveLanguage,
      });

      outputChannel.appendLine(`    Total Requests       : ${analytics.totalRequests}`);
      outputChannel.appendLine(`    Total Tokens         : ${analytics.totalTokens}`);
      outputChannel.appendLine(`    Avg Prompt Tokens    : ${analytics.averagePromptTokens}`);
      outputChannel.appendLine(`    Avg Response Tokens  : ${analytics.averageResponseTokens}`);
      outputChannel.appendLine(`    Most Active Workspace: ${analytics.mostActiveWorkspace}`);
      outputChannel.appendLine(`    Most Active Language : ${analytics.mostActiveLanguage}`);

      track(4, "Statistics Calculation", true);
      return { passed: true };
    });

    // ── Step 5: Today's Stats ─────────────────────────────────────────────────
    await runStep(outputChannel, 5, "Today's Statistics", async () => {
      const today = DateUtils.getToday();
      logger.debug("[DIAG]   fetching daily stats for:", today);
      const todayStats = await statistics.getDailyStats(today);
      logger.debug("[DIAG]   daily stats:", {
        requestCount: todayStats.requestCount,
        totalTokens: todayStats.totalTokens,
      });

      outputChannel.appendLine(`    Date                 : ${todayStats.date}`);
      outputChannel.appendLine(`    Request Count        : ${todayStats.requestCount}`);
      outputChannel.appendLine(`    Total Tokens Today   : ${todayStats.totalTokens}`);
      outputChannel.appendLine(`    Average Tokens       : ${todayStats.averageTokens}`);

      track(5, "Today's Statistics", true);
      return { passed: true };
    });

    // ── Step 6: Write Test Record ─────────────────────────────────────────────
    let testRecordId = 0;
    await runStep(outputChannel, 6, "Write Test Record", async () => {
      const payload = {
        timestamp: DateUtils.toISOString(),
        workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "/test/workspace",
        language: "typescript",
        file: "/test/file.ts",
        prompt: "[DIAGNOSTIC TEST] This is a test prompt",
        response: "[DIAGNOSTIC TEST] This is a test response",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        duration: 1000,
        sessionId: sessionManager.getCurrentSessionId(),
        model: "diagnostic",
        cost: 0,
      };
      logger.debug("[DIAG]   inserting test record…", { workspace: payload.workspace, sessionId: payload.sessionId });
      testRecordId = await database.addUsageRecord(payload);
      logger.debug("[DIAG]   insert succeeded, id:", testRecordId);

      outputChannel.appendLine(`    Inserted record ID   : ${testRecordId}`);
      outputChannel.appendLine(`    Timestamp            : ${payload.timestamp}`);

      track(6, "Write Test Record", true);
      return { passed: true, detail: `id = ${testRecordId}` };
    });

    // ── Step 7: Persistence Verification ─────────────────────────────────────
    await runStep(outputChannel, 7, "Persistence Verification", async () => {
      logger.debug("[DIAG]   re-querying all records to verify persistence…");
      const recordsAfter = await database.getUsageRecords();
      logger.debug("[DIAG]   record count after insert:", recordsAfter.length);

      const found = recordsAfter.find((r) => r.id === testRecordId);
      logger.debug("[DIAG]   test record found:", { found: found !== undefined, id: testRecordId });

      outputChannel.appendLine(`    Total records now    : ${recordsAfter.length}`);
      outputChannel.appendLine(`    Test record found    : ${found ? "Yes" : "No"}`);
      if (found) {
        outputChannel.appendLine(`    Prompt preview       : ${found.prompt.substring(0, 60)}…`);
        outputChannel.appendLine(`    Tokens               : ${found.totalTokens}`);
      }

      const passed = found !== undefined;
      track(7, "Persistence Verification", passed);
      return { passed, detail: passed ? "durable write confirmed" : "record missing after insert" };
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    const failed = results.filter((r) => !r.passed);
    outputChannel.appendLine("========================================");
    outputChannel.appendLine(`   Finished: ${ts()}`);
    outputChannel.appendLine("----------------------------------------");
    results.forEach((r) => {
      outputChannel.appendLine(`  ${r.passed ? "✅" : "❌"} Step ${r.step}: ${r.title}`);
    });
    outputChannel.appendLine("----------------------------------------");

    if (failed.length === 0) {
      outputChannel.appendLine("✅ ALL STEPS PASSED — STORAGE IS WORKING");
    } else {
      outputChannel.appendLine(`⚠️  ${failed.length} STEP(S) HAD ISSUES`);
      outputChannel.appendLine("\nFailed steps:");
      failed.forEach((r) => outputChannel.appendLine(`  • Step ${r.step}: ${r.title}`));
      outputChannel.appendLine("\nRecommendations:");
      outputChannel.appendLine("  1. Open 'Copilot Usage Tracker' output channel for runtime logs");
      outputChannel.appendLine("  2. Use '@tracker <message>' in VS Code Chat to record usage");
      outputChannel.appendLine("  3. Restart the extension host (Ctrl+Shift+P → Restart Extension Host)");
    }
    outputChannel.appendLine("========================================\n");

    logger.info("[DIAG] Diagnostic run finished", {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: failed.length,
    });

    await vscode.window.showInformationMessage(
      failed.length === 0
        ? "📊 All diagnostic steps passed. Check the output panel for details."
        : `⚠️ ${failed.length} diagnostic step(s) failed. Check the output panel for details.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine("========================================");
    outputChannel.appendLine(`❌ DIAGNOSTIC ABORTED — ${msg}`);
    outputChannel.appendLine("========================================\n");
    logger.error("[DIAG] Diagnostic run aborted", error);
    await vscode.window.showErrorMessage(`Diagnostic aborted: ${msg}`);
  }
}
