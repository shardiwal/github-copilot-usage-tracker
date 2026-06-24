/**
 * Command to ask Copilot using the VS Code Language Model API
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { tokenEstimator } from "../tracker/tokenEstimator";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";

export async function askCopilotCommand(
  _context: vscode.ExtensionContext,
  database: Database
): Promise<void> {
  const prompt = await vscode.window.showInputBox({
    placeHolder: "Ask Copilot a question...",
    prompt: "Enter your question for Copilot",
  });

  if (!prompt) {
    return;
  }

  try {
    logger.info("User asked Copilot", { promptLength: prompt.length });

    // Select a Copilot language model
    const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    if (!models.length) {
      await vscode.window.showErrorMessage(
        "No Copilot language models available. Ensure GitHub Copilot is installed and signed in."
      );
      return;
    }

    const model = models[0];
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const cts = new vscode.CancellationTokenSource();

    const startTime = Date.now();

    // Count input tokens using the model's own tokeniser
    const inputTokens = await model.countTokens(messages[0], cts.token);

    // Send the request to Copilot
    const response = await model.sendRequest(messages, {}, cts.token);

    // Stream and collect the full response text
    let responseText = "";
    for await (const chunk of response.stream) {
      if (chunk instanceof vscode.LanguageModelTextPart) {
        responseText += chunk.value;
      }
    }

    const duration = Date.now() - startTime;

    // Count output tokens using the model's own tokeniser
    const outputTokens = await model.countTokens(
      vscode.LanguageModelChatMessage.Assistant(responseText),
      cts.token
    );
    cts.dispose();

    const totalTokens = inputTokens + outputTokens;

    // Record in session
    sessionManager.recordTokenUsage(totalTokens);

    // Get workspace and file info from the active editor
    const editor = vscode.window.activeTextEditor;
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "unknown";
    const file = editor?.document.uri.fsPath || "unknown";
    const language = editor?.document.languageId || "unknown";

    // Record in database
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
    });

    logger.info("Recorded usage", { recordId, model: model.id, inputTokens, outputTokens, totalTokens });

    // Show the response in an output channel so the user can read it
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
      logger.error("Language model error", { code: error.code, message: error.message });
      await vscode.window.showErrorMessage(`Copilot error: ${error.message}`);
    } else {
      logger.error("Error in askCopilot command", error);
      await vscode.window.showErrorMessage("Error recording Copilot usage");
    }
  }
}
