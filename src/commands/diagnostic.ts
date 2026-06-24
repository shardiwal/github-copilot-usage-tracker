/**
 * Diagnostic command to test storage functionality
 */

import * as vscode from "vscode";
import { Database } from "../tracker/database";
import { Statistics } from "../tracker/statistics";
import { sessionManager } from "../tracker/sessionManager";
import { DateUtils } from "../utils/date";
import { logger } from "../tracker/logger";

export async function diagnosticCommand(
  _context: vscode.ExtensionContext,
  database: Database,
  statistics: Statistics
): Promise<void> {
  try {
    logger.info("🧪 Running Diagnostics...");

    // Create output channel for diagnostics
    const outputChannel = vscode.window.createOutputChannel("Copilot Tracker Diagnostics");
    outputChannel.clear();
    outputChannel.show();

    outputChannel.appendLine("========================================");
    outputChannel.appendLine("📊 COPILOT USAGE TRACKER - DIAGNOSTICS");
    outputChannel.appendLine("========================================\n");

    // Test 1: Session Info
    outputChannel.appendLine("📝 Test 1: Session Information");
    const currentSession = sessionManager.getCurrentSessionId();
    outputChannel.appendLine(`✓ Current Session ID: ${currentSession}`);
    const sessionStats = sessionManager.getSessionStats();
    outputChannel.appendLine(`✓ Total Sessions: ${sessionStats.totalSessions}`);
    outputChannel.appendLine(`✓ Active Sessions: ${sessionStats.activeSessions}`);
    outputChannel.appendLine(`✓ Total Tokens (Session): ${sessionStats.totalTokens}`);
    outputChannel.appendLine(`✓ Average Tokens/Session: ${sessionStats.averageTokensPerSession}\n`);

    // Test 2: Database Connection
    outputChannel.appendLine("📝 Test 2: Database Connection");
    try {
      const testRecord = await database.getUsageRecords(undefined, 1);
      outputChannel.appendLine(`✓ Database Connected: Yes`);
      outputChannel.appendLine(`✓ Can Query Records: Yes\n`);
    } catch (error) {
      outputChannel.appendLine(`✗ Database Connection Failed: ${error}\n`);
      throw error;
    }

    // Test 3: Retrieve All Records
    outputChannel.appendLine("📝 Test 3: Retrieving Records");
    const allRecords = await database.getUsageRecords();
    outputChannel.appendLine(`✓ Total Records in Database: ${allRecords.length}`);

    if (allRecords.length > 0) {
      outputChannel.appendLine("\n  📋 Sample Records:");
      const sampleRecords = allRecords.slice(-3); // Last 3 records
      sampleRecords.forEach((record, index) => {
        outputChannel.appendLine(`    ${index + 1}. ID: ${record.id}`);
        outputChannel.appendLine(`       - Language: ${record.language}`);
        outputChannel.appendLine(`       - Tokens: ${record.totalTokens}`);
        outputChannel.appendLine(`       - Timestamp: ${record.timestamp}`);
        outputChannel.appendLine(`       - Session: ${record.sessionId}`);
      });
    } else {
      outputChannel.appendLine(
        "\n  ⚠️  WARNING: No records found in database. Data may not be storing correctly."
      );
    }
    outputChannel.appendLine("");

    // Test 4: Get Statistics
    outputChannel.appendLine("📝 Test 4: Statistics Calculation");
    const analytics = await statistics.getAnalytics();
    outputChannel.appendLine(`✓ Total Requests: ${analytics.totalRequests}`);
    outputChannel.appendLine(`✓ Total Tokens: ${analytics.totalTokens}`);
    outputChannel.appendLine(`✓ Average Prompt Tokens: ${analytics.averagePromptTokens}`);
    outputChannel.appendLine(`✓ Average Response Tokens: ${analytics.averageResponseTokens}`);
    outputChannel.appendLine(`✓ Most Active Workspace: ${analytics.mostActiveWorkspace}`);
    outputChannel.appendLine(`✓ Most Active Language: ${analytics.mostActiveLanguage}\n`);

    // Test 5: Today's Statistics
    outputChannel.appendLine("📝 Test 5: Today's Statistics");
    const today = DateUtils.getToday();
    const todayStats = await statistics.getDailyStats(today);
    outputChannel.appendLine(`✓ Date: ${todayStats.date}`);
    outputChannel.appendLine(`✓ Today's Total Tokens: ${todayStats.totalTokens}`);
    outputChannel.appendLine(`✓ Request Count: ${todayStats.requestCount}`);
    outputChannel.appendLine(`✓ Average Tokens: ${todayStats.averageTokens}\n`);

    // Test 6: Add Test Record
    outputChannel.appendLine("📝 Test 6: Adding Test Record");
    const testRecordId = await database.addUsageRecord({
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
      sessionId: currentSession,
    });

    outputChannel.appendLine(`✓ Test Record Added with ID: ${testRecordId}`);
    outputChannel.appendLine(`✓ Record timestamp: ${DateUtils.toISOString()}`);
    outputChannel.appendLine("");

    // Test 7: Verify Record Was Saved
    outputChannel.appendLine("📝 Test 7: Verifying Record Persistence");
    const recordsAfterInsert = await database.getUsageRecords();
    outputChannel.appendLine(`✓ Total Records After Insert: ${recordsAfterInsert.length}`);

    const testRecord = recordsAfterInsert.find((r) => r.id === testRecordId);
    if (testRecord) {
      outputChannel.appendLine(`✓ Test Record Found: Yes`);
      outputChannel.appendLine(`  - Prompt: ${testRecord.prompt.substring(0, 50)}...`);
      outputChannel.appendLine(`  - Tokens: ${testRecord.totalTokens}`);
    } else {
      outputChannel.appendLine(`✗ Test Record NOT Found in database`);
    }
    outputChannel.appendLine("");

    // Summary
    outputChannel.appendLine("========================================");
    if (allRecords.length > 0 || testRecord) {
      outputChannel.appendLine("✅ DIAGNOSTICS COMPLETED - STORAGE IS WORKING");
    } else {
      outputChannel.appendLine("⚠️  DIAGNOSTICS COMPLETED - ISSUES DETECTED");
      outputChannel.appendLine("\nPossible Issues:");
      outputChannel.appendLine("1. Extension may not be tracking Copilot usage");
      outputChannel.appendLine("2. Database may not be persisting data");
      outputChannel.appendLine("3. Dashboard may not be loading data correctly");
      outputChannel.appendLine("\nRecommendations:");
      outputChannel.appendLine("1. Try using 'Ask Copilot' command to record usage");
      outputChannel.appendLine("2. Check extension logs for errors");
      outputChannel.appendLine("3. Try restarting the extension");
    }
    outputChannel.appendLine("========================================\n");

    logger.info("✅ Diagnostics completed");

    await vscode.window.showInformationMessage(
      "📊 Diagnostics completed. Check the 'Copilot Tracker Diagnostics' output panel."
    );
  } catch (error) {
    logger.error("Diagnostic command failed", error);
    await vscode.window.showErrorMessage("Diagnostic test failed. Check the logs.");
  }
}
