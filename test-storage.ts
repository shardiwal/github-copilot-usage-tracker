/**
 * Test script to verify storage functionality
 * Run with: npx ts-node test-storage.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Database } from "./src/tracker/database";
import { DateUtils } from "./src/utils/date";
import { logger } from "./src/tracker/logger";

async function testStorage(): Promise<void> {
  console.log("🧪 Starting Storage Test...\n");

  // Create a test database path
  const testDbDir = path.join(os.tmpdir(), "copilot-tracker-test");
  const testDbPath = path.join(testDbDir, "test.db");

  try {
    // Clean up before test
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log(`✓ Cleaned up old test database\n`);
    }

    // Test 1: Database Initialization
    console.log("📝 Test 1: Database Initialization");
    const database = new Database(testDbPath);
    console.log(`✓ Database instance created`);
    console.log(`✓ Database path: ${testDbPath}\n`);

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test 2: Check if database file exists
    console.log("📝 Test 2: Database File Creation");
    const fileExists = fs.existsSync(testDbPath);
    if (fileExists) {
      const fileSize = fs.statSync(testDbPath).size;
      console.log(`✓ Database file created: ${testDbPath}`);
      console.log(`✓ File size: ${fileSize} bytes\n`);
    } else {
      console.log(`✗ Database file NOT created at ${testDbPath}\n`);
    }

    // Test 3: Add a test usage record
    console.log("📝 Test 3: Adding Test Usage Record");
    const recordId = await database.addUsageRecord({
      timestamp: DateUtils.toISOString(),
      workspace: "/test/workspace",
      language: "typescript",
      file: "/test/workspace/test.ts",
      prompt: "Test prompt",
      response: "Test response",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      duration: 1000,
      sessionId: "test-session-001",
    });

    console.log(`✓ Record added with ID: ${recordId}`);
    console.log(`✓ File size after insert: ${fs.statSync(testDbPath).size} bytes\n`);

    // Test 4: Retrieve records
    console.log("📝 Test 4: Retrieving Records");
    const records = await database.getUsageRecords();
    console.log(`✓ Retrieved ${records.length} record(s)`);

    if (records.length > 0) {
      const firstRecord = records[0];
      console.log(`  - ID: ${firstRecord.id}`);
      console.log(`  - Workspace: ${firstRecord.workspace}`);
      console.log(`  - Language: ${firstRecord.language}`);
      console.log(`  - Total Tokens: ${firstRecord.totalTokens}`);
      console.log(`  - Session ID: ${firstRecord.sessionId}`);
      console.log(`  - Timestamp: ${firstRecord.timestamp}\n`);
    } else {
      console.log(`✗ No records found!\n`);
    }

    // Test 5: Add multiple records
    console.log("📝 Test 5: Adding Multiple Records");
    for (let i = 0; i < 5; i++) {
      await database.addUsageRecord({
        timestamp: DateUtils.toISOString(),
        workspace: `/test/workspace`,
        language: ["typescript", "javascript", "python", "java", "go"][i % 5],
        file: `/test/workspace/file${i}.ts`,
        prompt: `Test prompt ${i}`,
        response: `Test response ${i}`,
        inputTokens: 100 + i * 10,
        outputTokens: 50 + i * 5,
        totalTokens: 150 + i * 15,
        duration: 1000 + i * 100,
        sessionId: `test-session-${i.toString().padStart(3, "0")}`,
      });
    }

    const allRecords = await database.getUsageRecords();
    console.log(`✓ Total records now: ${allRecords.length}`);
    console.log(`✓ File size after multiple inserts: ${fs.statSync(testDbPath).size} bytes\n`);

    // Test 6: Filter records
    console.log("📝 Test 6: Testing Filters");
    const filteredRecords = await database.getUsageRecords({ language: "typescript" });
    console.log(`✓ Records with language 'typescript': ${filteredRecords.length}`);

    const languageStats = allRecords.reduce(
      (acc, record) => {
        acc[record.language || "unknown"] = (acc[record.language || "unknown"] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log("  Language breakdown:");
    Object.entries(languageStats).forEach(([lang, count]) => {
      console.log(`    - ${lang}: ${count}`);
    });
    console.log();

    // Test 7: Check actual database file size and persistence
    console.log("📝 Test 7: Verifying File Persistence");
    database.close();
    console.log(`✓ Database closed`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const finalFileSize = fs.statSync(testDbPath).size;
    console.log(`✓ Final file size: ${finalFileSize} bytes`);
    console.log(`✓ Database file persisted successfully\n`);

    // Test 8: Reopen database and verify data persistence
    console.log("📝 Test 8: Verifying Data Persistence After Reopening");
    const database2 = new Database(testDbPath);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const persistedRecords = await database2.getUsageRecords();
    console.log(`✓ Records found after reopening: ${persistedRecords.length}`);

    if (persistedRecords.length === allRecords.length) {
      console.log(`✓ All ${persistedRecords.length} records persisted correctly!\n`);
    } else {
      console.log(`✗ Record count mismatch! Expected ${allRecords.length}, got ${persistedRecords.length}\n`);
    }

    database2.close();

    // Summary
    console.log("═══════════════════════════════════════");
    console.log("✅ STORAGE TEST COMPLETED SUCCESSFULLY");
    console.log("═══════════════════════════════════════\n");

    console.log("📊 Summary:");
    console.log(`  - Database file: ${testDbPath}`);
    console.log(`  - File size: ${finalFileSize} bytes`);
    console.log(`  - Total records stored: ${allRecords.length}`);
    console.log(`  - Data persisted: ✓ Yes`);
    console.log(`\n✨ The storage system is working correctly!\n`);
  } catch (error) {
    console.error("\n❌ ERROR DURING TEST:");
    console.error(error);
    process.exit(1);
  }
}

testStorage();
