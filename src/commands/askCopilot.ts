/**
 * Command to ask Copilot using the VS Code Language Model API
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { tokenEstimator } from "../tracker/tokenEstimator";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";
import { calculateCost } from "../tracker/costCalculator";

/**
 * Prompts the user for a question, sends it to a Copilot language model via
 * the VS Code Language Model API, streams the response, and records the token
 * usage and cost to the extension database.
 *
 * @param _context - The VS Code extension context (unused but required by the
 *   command registration signature).
 * @param database - The {@link Database} instance used to persist usage records.
 * @returns A promise that resolves when the command has finished executing.
 *
 * @remarks
 * - Requires at least one Copilot chat model to be available (`vendor: "copilot"`).
 * - Token counts are obtained from the model's own tokeniser via
 *   {@link vscode.LanguageModelChat.countTokens}.
 * - The response is streamed and displayed in a dedicated "Copilot Response"
 *   output channel.
 * - On success the record is also reflected in {@link sessionManager} so that
 *   the status-bar totals stay current.
 *
 * @example
 * ```typescript
 * // Registered in extension.ts
 * vscode.commands.registerCommand(
 *   'copilot-token-tracker.askCopilot',
 *   (ctx) => askCopilotCommand(ctx, database)
 * );
 * ```
 */
export async function askCopilotCommand(
  _context: vscode.ExtensionContext,
  database: Database
): Promise<void> {
  const prompt = await vscode.window.showInputBox({
    placeHolder: "Ask Copilot a question...",
    prompt: "Enter your question for Copilot",
  });

  if (!prompt) {
    logger.debug("[askCopilot] user cancelled input box — aborting");
    return;
  }

  try {
    logger.debug("[askCopilot] prompt received", { promptLength: prompt.length });
    logger.info("User asked Copilot", { promptLength: prompt.length });

    // Select a Copilot language model
    logger.debug("[askCopilot] selecting Copilot chat models…");
    const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    logger.debug("[askCopilot] models available", { count: models.length, ids: models.map((m) => m.id) });

    if (!models.length) {
      logger.error("[askCopilot] no Copilot models available — aborting");
      await vscode.window.showErrorMessage(
        "No Copilot language models available. Ensure GitHub Copilot is installed and signed in."
      );
      return;
    }

    const model = models[0];
    logger.debug("[askCopilot] using model", { id: model.id, name: model.name });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const cts = new vscode.CancellationTokenSource();

    const startTime = Date.now();

    // Count input tokens using the model's own tokeniser
    logger.debug("[askCopilot] counting input tokens…");
    const inputTokens = await model.countTokens(messages[0], cts.token);
    logger.debug("[askCopilot] input tokens counted", { inputTokens });

    // Send the request to Copilot
    logger.debug("[askCopilot] sending request to model…");
    const response = await model.sendRequest(messages, {}, cts.token);
    logger.debug("[askCopilot] response stream opened — streaming chunks…");

    // Stream and collect the full response text
    let responseText = "";
    let chunkCount = 0;
    for await (const chunk of response.stream) {
      if (chunk instanceof vscode.LanguageModelTextPart) {
        responseText += chunk.value;
        chunkCount++;
      }
    }

    const duration = Date.now() - startTime;
    logger.debug("[askCopilot] stream complete", { chunkCount, responseLength: responseText.length, durationMs: duration });

    // Count output tokens using the model's own tokeniser
    logger.debug("[askCopilot] counting output tokens…");
    const outputTokens = await model.countTokens(
      vscode.LanguageModelChatMessage.Assistant(responseText),
      cts.token
    );
    cts.dispose();

    const totalTokens = inputTokens + outputTokens;
    const cost = calculateCost(model.id, inputTokens, outputTokens);
    logger.debug("[askCopilot] token counts finalised", { inputTokens, outputTokens, totalTokens, cost });

    // Record in session
    sessionManager.recordTokenUsage(totalTokens);
    logger.debug("[askCopilot] session usage recorded");

    // Get workspace and file info from the active editor
    const editor = vscode.window.activeTextEditor;
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "unknown";
    const file = editor?.document.uri.fsPath || "unknown";
    const language = editor?.document.languageId || "unknown";
    logger.debug("[askCopilot] context resolved", { workspace, file, language });

    // Record in database
    logger.debug("[askCopilot] inserting usage record into database…");
    const recordId = await database.addUsageRecord({
      timestamp: DateUtils.toISOString(),
      workspace,
      language,
      file,
      prompt,
      response: responseText,
      inputTokens,
      outputTokens,
      totalTokens,
      duration,
      sessionId: sessionManager.getCurrentSessionId(),
      model: model.id,
      cost,
    });

    logger.info("Recorded usage", { recordId, model: model.id, inputTokens, outputTokens, totalTokens });
    logger.debug("[askCopilot] database insert succeeded", { recordId });

    // Show the response in an output channel so the user can read it
    logger.debug("[askCopilot] rendering response to output channel");
    const outputChannel = vscode.window.createOutputChannel("Copilot Response");
    outputChannel.clear();
    outputChannel.appendLine(`Prompt: ${prompt}`);
    outputChannel.appendLine("");
    outputChannel.appendLine(`Response (${model.name ?? model.id}):`);
    outputChannel.appendLine(responseText);
    outputChannel.appendLine("");
    outputChannel.appendLine(
      `Tokens — input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens} | ${duration}ms`
    );
    outputChannel.show(true);
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      logger.error("[askCopilot] language model error", { code: error.code, message: error.message });
      await vscode.window.showErrorMessage(`Copilot error: ${error.message}`);
    } else {
      logger.error("[askCopilot] unexpected error", error);
      await vscode.window.showErrorMessage("Error recording Copilot usage");
    }
  }
}
