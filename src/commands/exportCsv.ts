/**
 * Command to export data as CSV
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { FormatUtils } from "../utils/format";
import { ConfigUtils } from "../utils/config";
import { logger } from "../tracker/logger";

export async function exportCsvCommand(
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

    const fileName = `copilot-usage-${new Date().toISOString().split("T")[0]}.csv`;
    const exportDir = ConfigUtils.getExportDirectory();
    const filePath = path.join(exportDir, fileName);

    const csv = await generateCsv(records, statistics, database);

    fs.writeFileSync(filePath, csv, "utf-8");

    logger.info(`Exported CSV to ${filePath}`);

    await vscode.window.showInformationMessage(
      `Exported ${records.length} records to ${fileName}`,
      "Open File",
      "Open Folder"
    );
  } catch (error) {
    logger.error("Error exporting CSV", error);
    await vscode.window.showErrorMessage("Error exporting data");
  }
}

async function generateCsv(
  records: any[],
  statistics: Statistics,
  database: Database
): Promise<string> {
  const lines: string[] = [];

  lines.push(FormatUtils.toCsvRow(["Usage Record Export"]));
  lines.push(
    FormatUtils.toCsvRow([
      `Generated: ${new Date().toISOString()}`,
    ])
  );
  lines.push(FormatUtils.toCsvRow([`Total Records: ${records.length}`]));
  lines.push(FormatUtils.toCsvRow([`Total Tokens: ${await database.getTotalTokens()}`]));
  lines.push("");

  lines.push(
    FormatUtils.toCsvRow([
      "Timestamp",
      "Workspace",
      "Language",
      "File",
      "Input Tokens",
      "Output Tokens",
      "Total Tokens",
      "Duration (ms)",
      "Session ID",
    ])
  );

  for (const record of records) {
    lines.push(
      FormatUtils.toCsvRow([
        record.timestamp,
        record.workspace,
        record.language,
        record.file,
        record.inputTokens,
        record.outputTokens,
        record.totalTokens,
        record.duration,
        record.sessionId,
      ])
    );
  }

  lines.push("");
  lines.push(FormatUtils.toCsvRow(["Summary Statistics"]));

  const analytics = await statistics.getAnalytics();
  lines.push(
    FormatUtils.toCsvRow([
      "Metric",
      "Value",
    ])
  );
  lines.push(FormatUtils.toCsvRow(["Total Requests", analytics.totalRequests]));
  lines.push(FormatUtils.toCsvRow(["Total Tokens", analytics.totalTokens]));
  lines.push(
    FormatUtils.toCsvRow([
      "Average Prompt Tokens",
      analytics.averagePromptTokens,
    ])
  );
  lines.push(
    FormatUtils.toCsvRow([
      "Average Response Tokens",
      analytics.averageResponseTokens,
    ])
  );
  lines.push(FormatUtils.toCsvRow(["Most Active Workspace", analytics.mostActiveWorkspace]));
  lines.push(FormatUtils.toCsvRow(["Most Active Language", analytics.mostActiveLanguage]));

  return lines.join("\n");
}
