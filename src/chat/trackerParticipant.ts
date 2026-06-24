/**
 * VS Code chat participant — @tracker
 *
 * Users interact via "@tracker <question>" in the Chat panel.
 * Every request is forwarded to a Copilot language model and both
 * input and output tokens are recorded in the database.
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";

export const PARTICIPANT_ID = "copilot-tracker.tracker";

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  database: Database
): void {
  const participant = vscode.chat.createChatParticipant(
    PARTICIPANT_ID,
    async (
      request: vscode.ChatRequest,
      chatContext: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ) => {
      await handleRequest(request, chatContext, stream, token, database);
    }
  );

  participant.iconPath = new vscode.ThemeIcon("graph-line");
  context.subscriptions.push(participant);
  logger.info("Chat participant @tracker registered");
}

async function handleRequest(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  database: Database
): Promise<void> {
  // Select a Copilot language model
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
  if (!models.length) {
    stream.markdown(
      "⚠️ No Copilot language models available. Ensure GitHub Copilot is installed and signed in."
    );
    return;
  }

  const model = models[0];

  // Build the message list: include prior turns for context, then the new user message
  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(
      "You are a helpful assistant. Answer the user's question concisely and accurately."
    ),
  ];

  for (const turn of chatContext.history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .filter((p): p is vscode.ChatResponseMarkdownPart => p instanceof vscode.ChatResponseMarkdownPart)
        .map((p) => p.value.value)
        .join("");
      if (text) {
        messages.push(vscode.LanguageModelChatMessage.Assistant(text));
      }
    }
  }

  messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

  try {
    // Count input tokens for all messages
    let inputTokens = 0;
    for (const msg of messages) {
      inputTokens += await model.countTokens(msg, token);
    }

    const startTime = Date.now();

    const response = await model.sendRequest(messages, {}, token);

    // Stream response back to the chat panel and collect text for recording
    let responseText = "";
    for await (const chunk of response.stream) {
      if (chunk instanceof vscode.LanguageModelTextPart) {
        responseText += chunk.value;
        stream.markdown(chunk.value);
      }
    }

    const duration = Date.now() - startTime;

    // Count output tokens
    const outputTokens = await model.countTokens(
      vscode.LanguageModelChatMessage.Assistant(responseText),
      token
    );

    const totalTokens = inputTokens + outputTokens;

    // Record in session
    sessionManager.recordTokenUsage(totalTokens);

    // Get workspace context
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "unknown";
    const editor = vscode.window.activeTextEditor;
    const file = editor?.document.uri.fsPath || "unknown";
    const language = editor?.document.languageId || "unknown";

    // Persist to database
    const recordId = await database.addUsageRecord({
      timestamp: DateUtils.toISOString(),
      workspace,
      language,
      file,
      prompt: request.prompt,
      response: responseText,
      inputTokens,
      outputTokens,
      totalTokens,
      duration,
      sessionId: sessionManager.getCurrentSessionId(),
    });

    logger.info("@tracker recorded usage", {
      recordId,
      model: model.id,
      inputTokens,
      outputTokens,
      totalTokens,
    });

    // Append token summary at the bottom of the chat response
    stream.markdown(
      `\n\n---\n*Tracked — model: \`${model.name ?? model.id}\` | ` +
        `tokens: ${inputTokens} in / ${outputTokens} out / **${totalTokens} total** | ${duration}ms*`
    );
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      logger.error("@tracker LM error", { code: error.code, message: error.message });
      stream.markdown(`⚠️ Copilot error: ${error.message}`);
    } else {
      logger.error("@tracker request failed", error);
      stream.markdown("⚠️ An error occurred while processing your request.");
    }
  }
}
