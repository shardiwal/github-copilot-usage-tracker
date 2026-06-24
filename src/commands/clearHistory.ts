/**
 * Command to clear usage history
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { logger } from "../tracker/logger";

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
