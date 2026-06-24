/**
 * Command to clear usage history
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { logger } from "../tracker/logger";

/**
 * Prompts the user for confirmation and, if confirmed, permanently deletes all
 * usage records from the database.
 *
 * @param _context - The VS Code extension context (unused but required by the
 *   command registration signature).
 * @param database - The {@link Database} instance whose records will be cleared.
 * @returns A promise that resolves when the operation completes or is cancelled.
 *
 * @remarks
 * The confirmation dialog is shown as a modal so the user must explicitly
 * acknowledge the destructive nature of the operation before it proceeds.
 * If the user dismisses the dialog without clicking **Clear History** the
 * function returns without making any changes.
 *
 * @example
 * ```typescript
 * // Registered in extension.ts
 * vscode.commands.registerCommand(
 *   'copilot-tracker.clearHistory',
 *   (ctx) => clearHistoryCommand(ctx, database)
 * );
 * ```
 */
export async function clearHistoryCommand(
  _context: vscode.ExtensionContext,
  database: Database
): Promise<void> {
  try {
    const confirmed = await vscode.window.showWarningMessage(
      "Are you sure you want to clear all usage history? This cannot be undone.",
      { modal: true },
      "Clear History"
    );

    if (confirmed === "Clear History") {
      await database.clearUsageRecords();
      logger.info("Usage history cleared");
      await vscode.window.showInformationMessage("Usage history cleared successfully");
    }
  } catch (error) {
    logger.error("Error clearing history", error);
    await vscode.window.showErrorMessage("Error clearing history");
  }
}
