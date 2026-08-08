// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// ─────────────────────────────────────────────────────────────
// Database Layer — public CRUD facade used by main.js / ipc handlers.
// Backed by better-sqlite3 (WAL) + drizzle-orm. See ./db/schema.js and
// ./db/client.js for the connection/migration internals.
//
// Scope of this module: users, games_library, play_sessions.
// (Achievements / settings / AI reports live in the legacy JSON store for
// now — see the integration notes shipped alongside this file.)
// ─────────────────────────────────────────────────────────────
'use strict';

const crypto = require('crypto');
const { eq, and, desc, sql } = require('drizzle-orm');
const client = require('./db/client');
const { users, gamesLibrary, playSessions } = require('./db/schema');

function uuid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

// ───────────────────────────────────────────────────────────
// Lifecycle — call once from main.js, guard everything else behind it
// ───────────────────────────────────────────────────────────

let _initialized = false;

/**
 * Safe startup sequence for the SQLite layer.
 * Call from `app.whenReady()`, BEFORE creating any BrowserWindow, so a
 * corrupt DB fails fast instead of surfacing as a blank/broken UI.
 *
 * @param {string} dbFilePath e.g. path.join(app.getPath('userData'), 'zaiken.db')
 * @returns {boolean}
 */
function init(dbFilePath) {
  if (!dbFilePath) throw new Error('[Zaiken DB] init() requires an absolute db file path');

  client.initDatabase(dbFilePath);

  const check = client.quickCheck();
  if (!check.ok) {
    // Never run the app on top of a corrupted file — surface it loudly.
    client.closeDatabase();
    throw new Error(`[Zaiken DB] integrity check failed: ${check.detail}`);
  }

  _initialized = true;
  console.log(`[Zaiken DB] ready at ${dbFilePath} (WAL mode)`);
  return true;
}

function assertReady() {
  if (!_initialized) throw new Error('[Zaiken DB] database.init(dbFilePath) was not called yet.');
}

function close() {
  client.closeDatabase();
  _initialized = false;
}

// ───────────────────────────────────────────────────────────
// USERS
// ───────────────────────────────────────────────────────────

/**
 * @param {{ username: string, settings?: object }} input
 */
function createUser({ username, settings = {} } = {}) {
  assertReady();
  const clean = String(username || '').trim();
  if (!clean) throw new Error('username is required');

  const db = client.getDb();
  const row = { id: uuid(), username: clean, settings: JSON.stringify(settings) };
  db.insert(users).values(row).run();
  return getUserById(row.id);
}

function getUserById(id) {
  assertReady();
  const row = client.getDb().select().from(users).where(eq(users.id, id)).get();
  return row ? deserializeUser(row) : null;
}

function getUserByUsername(username) {
  assertReady();
  const row = client.getDb().select().from(users).where(eq(users.username, username)).get();
  return row ? deserializeUser(row) : null;
}

function listUsers() {
  assertReady();
  return client.getDb().select().from(users).all().map(deserializeUser);
}

/** Shallow-merges `partialSettings` into the user's existing settings JSON. */
function updateUserSettings(id, partialSettings = {}) {
  assertReady();
  const existing = getUserById(id);
  if (!existing) return null;

  const merged = { ...existing.settings, ...partialSettings };
  client.getDb()
    .update(users)
    .set({ settings: JSON.stringify(merged), updatedAt: nowIso() })
    .where(eq(users.id, id))
    .run();

  return getUserById(id);
}

function renameUser(id, username) {
  assertReady();
  const clean = String(username || '').trim();
  if (!clean) throw new Error('username is required');
  const info = client.getDb()
    .update(users)
    .set({ username: clean, updatedAt: nowIso() })
    .where(eq(users.id, id))
    .run();
  return info.changes > 0 ? getUserById(id) : null;
}

function deleteUser(id) {
  assertReady();
  const info = client.getDb().delete(users).where(eq(users.id, id)).run();
  return info.changes > 0;
}

function deserializeUser(row) {
  let settings = {};
  try { settings = JSON.parse(row.settings || '{}'); } catch (_) { /* leave {} on corrupt blob */ }
  return { ...row, settings };
}

// ───────────────────────────────────────────────────────────
// GAMES LIBRARY
// ───────────────────────────────────────────────────────────

/**
 * @param {{ appId?: string, name: string, executablePath?: string, platform?: string, coverImage?: string }} game
 */
function addGame(game = {}) {
  assertReady();
  const name = String(game.name || '').trim();
  if (!name) throw new Error('game.name is required');

  const db = client.getDb();
  const row = {
    id: uuid(),
    appId: game.appId ?? null,
    name,
    executablePath: game.executablePath ?? null,
    platform: game.platform || 'custom',
    coverImage: game.coverImage ?? null,
    totalPlaytime: 0,
  };
  db.insert(gamesLibrary).values(row).run();
  return getGameById(row.id);
}

function getGameById(id) {
  assertReady();
  return client.getDb().select().from(gamesLibrary).where(eq(gamesLibrary.id, id)).get() || null;
}

function getGameByAppId(appId, platform) {
  assertReady();
  return client.getDb()
    .select()
    .from(gamesLibrary)
    .where(and(eq(gamesLibrary.appId, appId), eq(gamesLibrary.platform, platform)))
    .get() || null;
}

/** All games, most recently played first. */
function listGames() {
  assertReady();
  return client.getDb().select().from(gamesLibrary).orderBy(desc(gamesLibrary.lastPlayedAt)).all();
}

// Fields the caller can never overwrite directly — they're derived/managed internally.
const GAME_PROTECTED_FIELDS = new Set(['id', 'createdAt', 'totalPlaytime']);

function updateGame(id, data = {}) {
  assertReady();
  const patch = { updatedAt: nowIso() };
  for (const [key, value] of Object.entries(data)) {
    if (GAME_PROTECTED_FIELDS.has(key)) continue;
    patch[key] = value;
  }
  const info = client.getDb().update(gamesLibrary).set(patch).where(eq(gamesLibrary.id, id)).run();
  return info.changes > 0 ? getGameById(id) : null;
}

/** Deletes a game; play_sessions rows cascade automatically (FK ON DELETE CASCADE). */
function deleteGame(id) {
  assertReady();
  const info = client.getDb().delete(gamesLibrary).where(eq(gamesLibrary.id, id)).run();
  return info.changes > 0;
}

// ───────────────────────────────────────────────────────────
// PLAY SESSIONS
// ───────────────────────────────────────────────────────────

/** Opens a session — call the moment the game process is detected running. */
function startSession(gameId) {
  assertReady();
  const game = getGameById(gameId);
  if (!game) throw new Error(`[Zaiken DB] unknown gameId: ${gameId}`);

  const row = { id: uuid(), gameId, startTime: nowIso(), endTime: null, duration: 0 };
  client.getDb().insert(playSessions).values(row).run();
  return row;
}

/**
 * Closes a session and, in the same transaction, bumps the parent game's
 * total_playtime + last_played_at. Idempotent: calling it twice on an
 * already-closed session just returns the existing row.
 */
function endSession(sessionId) {
  assertReady();
  const conn = client.getSqlite();
  const db = client.getDb();

  const run = conn.transaction(() => {
    const session = db.select().from(playSessions).where(eq(playSessions.id, sessionId)).get();
    if (!session) throw new Error(`[Zaiken DB] unknown sessionId: ${sessionId}`);
    if (session.endTime) return session; // already closed — no-op

    const end = nowIso();
    const durationSec = Math.max(0, Math.round((new Date(end) - new Date(session.startTime)) / 1000));

    db.update(playSessions)
      .set({ endTime: end, duration: durationSec })
      .where(eq(playSessions.id, sessionId))
      .run();

    db.update(gamesLibrary)
      .set({
        totalPlaytime: sql`${gamesLibrary.totalPlaytime} + ${durationSec}`,
        lastPlayedAt: end,
        updatedAt: end,
      })
      .where(eq(gamesLibrary.id, session.gameId))
      .run();

    return { ...session, endTime: end, duration: durationSec };
  });

  return run();
}

function getSessionsForGame(gameId, limit = 50) {
  assertReady();
  return client.getDb()
    .select()
    .from(playSessions)
    .where(eq(playSessions.gameId, gameId))
    .orderBy(desc(playSessions.startTime))
    .limit(limit)
    .all();
}

function getRecentSessions(limit = 20) {
  assertReady();
  return client.getDb().select().from(playSessions).orderBy(desc(playSessions.startTime)).limit(limit).all();
}

/** Minutes played per day for the last `days` days — feeds the analytics chart. */
function getDailyPlaytime(days = 7) {
  assertReady();
  const conn = client.getSqlite();
  const rows = conn.prepare(`
    SELECT substr(start_time, 1, 10) AS day, SUM(duration) AS seconds, COUNT(*) AS sessions
    FROM play_sessions
    WHERE start_time >= datetime('now', ?)
    GROUP BY day
    ORDER BY day ASC
  `).all(`-${days} days`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const day = d.toISOString().slice(0, 10);
    const r = byDay.get(day);
    return { date: day, minutes: r ? Math.round(r.seconds / 60) : 0, sessions: r ? r.sessions : 0 };
  });
}

module.exports = {
  init,
  close,
  // users
  createUser, getUserById, getUserByUsername, listUsers, updateUserSettings, renameUser, deleteUser,
  // games_library
  addGame, getGameById, getGameByAppId, listGames, updateGame, deleteGame,
  // play_sessions
  startSession, endSession, getSessionsForGame, getRecentSessions, getDailyPlaytime,
};
