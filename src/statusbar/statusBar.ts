/**
 * Status bar display for today's token count
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { FormatUtils } from "../utils/format";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private database: Database) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = "copilot-tracker.dashboard";
    this.update().catch((error) => {
      logger.error("Error updating status bar on init", error);
    });

    // Update every minute
    setInterval(() => {
      this.update().catch((error) => {
        logger.error("Error updating status bar on interval", error);
      });
    }, 60000);
  }

  public async update(): Promise<void> {
    try {
      const today = DateUtils.getToday();
      const tokens = await this.database.getTotalTokensByDate(today);

      this.statusBarItem.text = `📊 ${FormatUtils.formatTokens(tokens)} Tokens Today`;
      this.statusBarItem.tooltip = `Click to open Copilot Usage Dashboard\n\nToday's Token Count: ${FormatUtils.formatNumber(tokens)}`;
      this.statusBarItem.show();
    } catch (error) {
      logger.error("Error updating status bar", error);
    }
  }

  public show(): void {
    this.statusBarItem.show();
  }

  public hide(): void {
    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
