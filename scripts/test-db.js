/**
 * Standalone Node.js database test — no TypeScript / build step required.
 * Usage: node scripts/test-db.js
 *
 * Tests the full insert → persist → reload → read cycle that the extension uses.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const root      = path.join(__dirname, "..");
const wasmPath  = path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const initSqlJs = require(path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.js"));

const testDir  = path.join(os.tmpdir(), "copilot-tracker-dbtest");
const testDb   = path.join(testDir, "test.db");

// ─── helpers ──────────────────────────────────────────────────────────────────
function pass(msg) { console.log("  ✓", msg); }
function fail(msg) { console.error("  ✗", msg); process.exitCode = 1; }
function section(title) { console.log(`\n📝 ${title}`); }

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Copilot Tracker — Database Smoke Test   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (!fs.existsSync(wasmPath)) { fail("sql-wasm.wasm not found at: " + wasmPath); return; }
  if (!fs.existsSync(testDir))  { fs.mkdirSync(testDir, { recursive: true }); }
  if (fs.existsSync(testDb))    { fs.unlinkSync(testDb); }

  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  // ── Test 1: table creation ─────────────────────────────────────────────────
  section("Test 1: Schema creation");
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   TEXT    NOT NULL,
      workspace   TEXT    NOT NULL,
      language    TEXT,
      file        TEXT,
      prompt      TEXT    NOT NULL,
      response    TEXT    NOT NULL,
      inputTokens INTEGER NOT NULL,
      outputTokens INTEGER NOT NULL,
      totalTokens INTEGER NOT NULL,
      duration    INTEGER NOT NULL,
      sessionId   TEXT    NOT NULL,
      model       TEXT    NOT NULL DEFAULT '',
      cost        REAL    NOT NULL DEFAULT 0,
      createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  pass("Table 'usage' created");

  // ── Test 2: insert ─────────────────────────────────────────────────────────
  section("Test 2: INSERT record");
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO usage
      (timestamp, workspace, language, file, prompt, response,
       inputTokens, outputTokens, totalTokens, duration, sessionId, model, cost)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  stmt.bind([now, "c:/project/test", "typescript", "test.ts",
             "Hello world prompt", "Hello world response",
             120, 60, 180, 1500, "sess-001", "gpt-4o", 0.0]);
  stmt.step();
  stmt.free();

  const idRow = db.prepare("SELECT last_insert_rowid() AS id");
  idRow.step();
  const insertedId = idRow.getAsObject().id;
  idRow.free();

  if (insertedId > 0) { pass(`Record inserted, id = ${insertedId}`); }
  else                { fail("INSERT returned id 0 or null"); }

  // ── Test 3: read back ──────────────────────────────────────────────────────
  section("Test 3: SELECT record back");
  const sel = db.prepare("SELECT * FROM usage WHERE id = ?");
  sel.bind([insertedId]);
  sel.step();
  const row = sel.getAsObject();
  sel.free();

  if (row.id)          { pass(`id            = ${row.id}`); }
  else                 { fail("id missing"); }
  if (row.prompt)      { pass(`prompt        = ${row.prompt}`); }
  if (row.inputTokens) { pass(`inputTokens   = ${row.inputTokens}`); }
  if (row.model)       { pass(`model         = ${row.model}`); }

  // ── Test 4: persist to disk ────────────────────────────────────────────────
  section("Test 4: Persist to disk");
  const data   = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(testDb, buffer);
  db.close();

  const fileSizeBytes = fs.statSync(testDb).size;
  if (fileSizeBytes > 0) { pass(`File written: ${testDb} (${fileSizeBytes} bytes)`); }
  else                   { fail("File is 0 bytes — nothing persisted"); }

  // ── Test 5: reload and verify ──────────────────────────────────────────────
  section("Test 5: Reload from disk and verify data survives");
  const buf2  = fs.readFileSync(testDb);
  const db2   = new SQL.Database(buf2);
  const count = db2.prepare("SELECT COUNT(*) AS n FROM usage");
  count.step();
  const n = count.getAsObject().n;
  count.free();
  db2.close();

  if (n === 1) { pass(`Record count after reload = ${n} ✔`); }
  else         { fail(`Expected 1 record after reload, got ${n}`); }

  // ── Test 6: insert 5 more records ─────────────────────────────────────────
  section("Test 6: Bulk insert (5 records) + reload");
  const db3 = new SQL.Database(fs.readFileSync(testDb));
  for (let i = 0; i < 5; i++) {
    const s = db3.prepare(`
      INSERT INTO usage
        (timestamp, workspace, language, file, prompt, response,
         inputTokens, outputTokens, totalTokens, duration, sessionId, model, cost)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    s.bind([new Date().toISOString(), "c:/project/test",
            ["typescript","python","go","rust","java"][i],
            `file${i}.ts`, `prompt ${i}`, `response ${i}`,
            100 + i*10, 50 + i*5, 150 + i*15, 1000 + i*100,
            `sess-00${i+2}`, "gpt-4o", 0.0]);
    s.step();
    s.free();
  }
  fs.writeFileSync(testDb, Buffer.from(db3.export()));
  db3.close();

  const db4  = new SQL.Database(fs.readFileSync(testDb));
  const cnt4 = db4.prepare("SELECT COUNT(*) AS n FROM usage");
  cnt4.step();
  const total = cnt4.getAsObject().n;
  cnt4.free();
  db4.close();

  if (total === 6) { pass(`Total records after bulk insert = ${total} ✔`); }
  else             { fail(`Expected 6, got ${total}`); }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  fs.rmSync(testDir, { recursive: true, force: true });

  // ── Summary ────────────────────────────────────────────────────────────────
  const ok = process.exitCode !== 1;
  console.log("\n" + (ok
    ? "═══════════════════════════════════════\n✅  All tests PASSED — database is healthy\n═══════════════════════════════════════"
    : "═══════════════════════════════════════\n❌  One or more tests FAILED\n═══════════════════════════════════════"));
}

main().catch((err) => { console.error("FATAL:", err); process.exitCode = 1; });
