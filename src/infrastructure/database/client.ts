/**
 * SQLite client bootstrap (WAL, FK, migrations)
 * Copyright © 2026 Zaid Bilal Banat
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { createLogger } from '../logging/Logger';

const log = createLogger('database');

let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

export function initDatabase(dbPath: string, options?: { readonly?: boolean }): BetterSQLite3Database<typeof schema> {
  if (db) return db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  sqlite = new Database(dbPath, { readonly: options?.readonly ?? false });
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('temp_store = MEMORY');

  runMigrations(sqlite);
  db = drizzle(sqlite, { schema });
  log.info({ dbPath }, 'database initialized');
  return db;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function getSqlite(): Database.Database {
  if (!sqlite) throw new Error('Database not initialized.');
  return sqlite;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    log.info('database closed');
  }
}

function runMigrations(conn: Database.Database): void {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const row = conn.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get() as
    | { value: string }
    | undefined;
  const current = row ? Number(row.value) : 0;

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    // fallback: apply embedded 0001 when packaged oddly
    applyInitSql(conn);
    conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run('1');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const match = /^(\d+)_/.exec(file);
    if (!match) continue;
    const version = Number(match[1]);
    if (version <= current) continue;

    const sqlText = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tx = conn.transaction(() => {
      conn.exec(sqlText);
      conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run(String(version));
    });
    tx();
    log.info({ version, file }, 'migration applied');
  }
}

function applyInitSql(conn: Database.Database): void {
  // minimal safety if migrations folder missing at runtime
  conn.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      genre TEXT,
      exe_path TEXT,
      cover_image TEXT,
      emoji TEXT DEFAULT '🎮',
      platform TEXT NOT NULL DEFAULT 'custom',
      steam_app_id TEXT,
      log_path TEXT,
      notes TEXT,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      kills INTEGER NOT NULL DEFAULT 0,
      deaths INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      matches INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT,
      added_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function quickCheck(): { ok: boolean; detail: string } {
  const conn = getSqlite();
  try {
    const result = conn.pragma('quick_check') as Array<{ quick_check: string }>;
    const detail = result.map((r) => r.quick_check).join('; ');
    return { ok: detail === 'ok', detail };
  } catch (e: any) {
    return { ok: false, detail: e?.message || String(e) };
  }
}
