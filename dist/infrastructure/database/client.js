"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
exports.getSqlite = getSqlite;
exports.closeDatabase = closeDatabase;
exports.quickCheck = quickCheck;
/**
 * SQLite client bootstrap (WAL, FK, migrations)
 * Copyright © 2026 Zaid Bilal Banat
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
const schema = __importStar(require("./schema"));
const Logger_1 = require("../logging/Logger");
const log = (0, Logger_1.createLogger)('database');
let sqlite = null;
let db = null;
function initDatabase(dbPath, options) {
    if (db)
        return db;
    fs_1.default.mkdirSync(path_1.default.dirname(dbPath), { recursive: true });
    sqlite = new better_sqlite3_1.default(dbPath, { readonly: options?.readonly ?? false });
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('temp_store = MEMORY');
    runMigrations(sqlite);
    db = (0, better_sqlite3_2.drizzle)(sqlite, { schema });
    log.info({ dbPath }, 'database initialized');
    return db;
}
function getDb() {
    if (!db)
        throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}
function getSqlite() {
    if (!sqlite)
        throw new Error('Database not initialized.');
    return sqlite;
}
function closeDatabase() {
    if (sqlite) {
        sqlite.close();
        sqlite = null;
        db = null;
        log.info('database closed');
    }
}
function runMigrations(conn) {
    conn.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
    const row = conn.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get();
    const current = row ? Number(row.value) : 0;
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    if (!fs_1.default.existsSync(migrationsDir)) {
        // fallback: apply embedded 0001 when packaged oddly
        applyInitSql(conn);
        conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run('1');
        return;
    }
    const files = fs_1.default
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const match = /^(\d+)_/.exec(file);
        if (!match)
            continue;
        const version = Number(match[1]);
        if (version <= current)
            continue;
        const sqlText = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf8');
        const tx = conn.transaction(() => {
            conn.exec(sqlText);
            conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run(String(version));
        });
        tx();
        log.info({ version, file }, 'migration applied');
    }
}
function applyInitSql(conn) {
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
function quickCheck() {
    const conn = getSqlite();
    try {
        const result = conn.pragma('quick_check');
        const detail = result.map((r) => r.quick_check).join('; ');
        return { ok: detail === 'ok', detail };
    }
    catch (e) {
        return { ok: false, detail: e?.message || String(e) };
    }
}
