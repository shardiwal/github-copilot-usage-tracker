/**
 * Command to export data as JSON
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { ExportData } from "../tracker/models";
import { ConfigUtils } from "../utils/config";
import { logger } from "../tracker/logger";

export async function exportJsonCommand(
  _context: vscode.ExtensionContext,
  database: Database,
  statistics: Statistics
): Promise<void> {
  try {
    const records = await database.getUsageRecords();

    if (records.length === 0) {
      await vscode.window.showWarningMessage("No usage records to export");
      return;
    }

    const fileName = `copilot-usage-${new Date().toISOString().split("T")[0]}.json`;
    const exportDir = ConfigUtils.getExportDirectory();
    const filePath = path.join(exportDir, fileName);

    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: records.length,
        totalTokens: await database.getTotalTokens(),
      },
      records,
      analytics: await statistics.getAnalytics(),
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), "utf-8");

    logger.info(`Exported JSON to ${filePath}`);

    await vscode.window.showInformationMessage(
      `Exported ${records.length} records to ${fileName}`,
      "Open File"
    );
  } catch (error) {
    logger.error("Error exporting JSON", error);
    await vscode.window.showErrorMessage("Error exporting data");
  }
}
