/**
 * SQLite database management for usage tracking using sql.js
 * Pure JavaScript implementation, no native compilation required
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { UsageRecord, FilterOptions } from "./models";
import { logger } from "./logger";

export class Database {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized: Promise<void>;
  private SQL: any = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.initialized = this.initialize();
  }

  /**
   * Initialize database and create tables if needed
   */
  private async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.SQL = await initSqlJs({
        locateFile: (file: string) => path.join(__dirname, file),
      });

      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        logger.info(`Database loaded from ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        logger.info(`New database created at ${this.dbPath}`);
      }

      this.createTables();
      this.save();
    } catch (error) {
      logger.error("Failed to initialize database", error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  /**
   * Public method to await database initialization. Throws if initialization failed.
   */
  public async waitForInit(): Promise<void> {
    await this.initialized;
  }

  /**
   * Create required tables
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const usageTableSQL = `
      CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        workspace TEXT NOT NULL,
        language TEXT,
        file TEXT,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        sessionId TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        cost REAL NOT NULL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const settingsTableSQL = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      this.db.run(usageTableSQL);
      this.db.run(settingsTableSQL);

      // Migrate existing databases: add columns if they don't exist yet
      const migrations = [
        "ALTER TABLE usage ADD COLUMN model TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE usage ADD COLUMN cost REAL NOT NULL DEFAULT 0",
      ];
      migrations.forEach((sql) => {
        try {
          this.db!.run(sql);
        } catch (_e) {
          // Column already exists — ignore
        }
      });

      const indexSQLs = [
        "CREATE INDEX IF NOT EXISTS idx_timestamp ON usage(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_workspace ON usage(workspace)",
        "CREATE INDEX IF NOT EXISTS idx_language ON usage(language)",
        "CREATE INDEX IF NOT EXISTS idx_sessionId ON usage(sessionId)",
        "CREATE INDEX IF NOT EXISTS idx_model ON usage(model)",
      ];

      indexSQLs.forEach((sql) => {
        try {
          this.db!.run(sql);
        } catch (e) {
          // Index might already exist
        }
      });

      logger.debug("Database tables created successfully");
    } catch (error) {
      logger.error("Failed to create tables", error);
      throw error;
    }
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      logger.error("Failed to save database", error);
    }
  }

  /**
   * Update output/total tokens, duration, and cost on the most-recent record
   * that belongs to the given session (created by the HookBridge on
   * UserPromptSubmit).  A no-op when no matching record exists.
   */
  public async updateUsageRecordBySession(
    sessionId: string,
    outputTokens: number,
    totalTokens: number,
    duration: number,
    cost: number
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    try {
      this.db.run(
        `UPDATE usage
            SET outputTokens = ?,
                totalTokens   = ?,
                duration      = ?,
                cost          = ?
          WHERE id = (
            SELECT id FROM usage
             WHERE sessionId = ?
             ORDER BY id DESC
             LIMIT 1
          )`,
        [outputTokens, totalTokens, duration, cost, sessionId]
      );
      this.save();
      logger.debug("HookBridge: updated session record", { sessionId, outputTokens, duration });
    } catch (error) {
      logger.error("Failed to update usage record by session", error);
    }
  }

  /**
   * Add a usage record
   */
  public async addUsageRecord(record: Omit<UsageRecord, "id">): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO usage (
          timestamp, workspace, language, file, prompt, response,
          inputTokens, outputTokens, totalTokens, duration, sessionId,
          model, cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.bind([
        record.timestamp,
        record.workspace,
        record.language,
        record.file,
        record.prompt,
        record.response,
        record.inputTokens,
        record.outputTokens,
        record.totalTokens,
        record.duration,
        record.sessionId,
        record.model ?? '',
        record.cost ?? 0,
      ]);

      stmt.step();
      stmt.free();

      // Get the last insert ID BEFORE saving (save/export must not clear it)
      const idResult = this.db.prepare("SELECT last_insert_rowid() AS id");
      idResult.step();
      const idRow = idResult.getAsObject();
      idResult.free();
      const id = idRow["id"] as number;

      this.save();

      return id ?? 0;
    } catch (error) {
      logger.error("Failed to add usage record", error);
      throw error;
    }
  }

  /**
   * Get all usage records with optional filtering
   */
  public async getUsageRecords(filters?: FilterOptions, limit?: number): Promise<UsageRecord[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      let query = "SELECT * FROM usage WHERE 1=1";
      const params: (string | number)[] = [];

      if (filters?.startDate) {
        query += " AND timestamp >= ?";
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += " AND timestamp <= ?";
        params.push(filters.endDate);
      }

      if (filters?.workspace) {
        query += " AND workspace = ?";
        params.push(filters.workspace);
      }

      if (filters?.language) {
        query += " AND language = ?";
        params.push(filters.language);
      }

      if (filters?.file) {
        query += " AND file LIKE ?";
        params.push(`%${filters.file}%`);
      }

      if (filters?.minTokens) {
        query += " AND totalTokens >= ?";
        params.push(filters.minTokens);
      }

      if (filters?.maxTokens) {
        query += " AND totalTokens <= ?";
        params.push(filters.maxTokens);
      }

      query += " ORDER BY timestamp DESC";

      if (limit) {
        query += ` LIMIT ${limit}`;
      }

      const stmt = this.db.prepare(query);
      if (params.length > 0) {
        stmt.bind(params as unknown[] as (string | number)[]);
      }

      const records: UsageRecord[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        records.push(row as unknown as UsageRecord);
      }

      stmt.free();
      return records;
    } catch (error) {
      logger.error("Failed to get usage records", error);
      return [];
    }
  }

  /**
   * Get records by date
   */
  public async getRecordsByDate(date: string): Promise<UsageRecord[]> {
    return this.getUsageRecords({
      startDate: `${date}T00:00:00`,
      endDate: `${date}T23:59:59`,
    });
  }

  /**
   * Get total tokens for a date
   */
  public async getTotalTokensByDate(date: string): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        SELECT SUM(totalTokens) as total FROM usage
        WHERE DATE(timestamp) = DATE(?)
      `);

      stmt.bind([date]);

      let total = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        total = (row.total as number) ?? 0;
      }

      stmt.free();
      return total;
    } catch (error) {
      logger.error("Failed to get total tokens by date", error);
      return 0;
    }
  }

  /**
   * Get total records count
   */
  public async getRecordCount(): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare("SELECT COUNT(*) as count FROM usage");

      let count = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        count = (row.count as number) ?? 0;
      }

      stmt.free();
      return count;
    } catch (error) {
      logger.error("Failed to get record count", error);
      return 0;
    }
  }

  /**
   * Get total tokens sum
   */
  public async getTotalTokens(): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare("SELECT SUM(totalTokens) as total FROM usage");

      let total = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        total = (row.total as number) ?? 0;
      }

      stmt.free();
      return total;
    } catch (error) {
      logger.error("Failed to get total tokens", error);
      return 0;
    }
  }

  /**
   * Clear all usage records
   */
  public async clearUsageRecords(): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      this.db.run("DELETE FROM usage");
      this.save();
      logger.info("Cleared all usage records");
      return true;
    } catch (error) {
      logger.error("Failed to clear usage records", error);
      return false;
    }
  }

  /**
   * Clean old records based on max history setting
   */
  public async pruneOldRecords(maxRecords: number): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const count = await this.getRecordCount();
      if (count > maxRecords) {
        const toDelete = count - maxRecords;
        const stmt = this.db.prepare(`
          DELETE FROM usage WHERE id IN (
            SELECT id FROM usage ORDER BY timestamp ASC LIMIT ?
          )
        `);

        stmt.bind([toDelete]);
        stmt.step();
        stmt.free();

        this.save();
        logger.info(`Pruned ${toDelete} old records from database`);
      }
    } catch (error) {
      logger.error("Failed to prune old records", error);
    }
  }

  /**
   * Get setting value
   */
  public async getSetting(key: string): Promise<string | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
      stmt.bind([key]);

      let value = null;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        value = (row.value as string) ?? null;
      }

      stmt.free();
      return value;
    } catch (error) {
      logger.error("Failed to get setting", error);
      return null;
    }
  }

  /**
   * Set setting value
   */
  public async setSetting(key: string, value: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `);

      stmt.bind([key, value]);
      stmt.step();
      stmt.free();

      this.save();
      return true;
    } catch (error) {
      logger.error("Failed to set setting", error);
      return false;
    }
  }

  /**
   * Backup database to specified location
   */
  public async backup(backupPath: string): Promise<boolean> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(backupPath, buffer);

      logger.info(`Database backed up to ${backupPath}`);
      return true;
    } catch (error) {
      logger.error("Failed to backup database", error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      logger.debug("Database closed");
    }
  }

  /**
   * Get database path
   */
  public getPath(): string {
    return this.dbPath;
  }
}

