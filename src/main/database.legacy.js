// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
'use strict';

/**
 * Zaiken's local persistence boundary. SQLite is authoritative; the exported
 * methods intentionally retain the renderer's stable DTOs while preventing
 * renderer supplied SQL, arbitrary columns, and partial aggregate updates.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

let connection = null;
let dataDirectory = null;
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nonNegativeInt = (value, fallback = 0) => Math.max(0, Math.round(number(value, fallback)));
const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback;

const DEFAULT_SETTINGS = Object.freeze({
  aiProvider: 'openai', aiModel: '', aiBaseUrl: '', aiWebSearch: true,
  aiDailyGames: ['Valorant', 'Counter-Strike 2', 'League of Legends', 'Dota 2', 'Fortnite', 'Rocket League'],
  theme: 'dark', accentColor: '#00FFB2', overlayEnabled: true, overlayOpacity: 90,
  overlayPosition: 'top-right', showFPS: true, showPing: true, showCPUTemp: true,
  showGPU: true, showKD: true, showWinRate: true, aiTipsEnabled: true,
  powerSaveBlock: true, notifications: true, startWithWindows: false,
  minimizeToTray: true, language: 'en', currency: 'USD', anticheatEnabled: true,
  logMonitorEnabled: true, logMonitorInterval: 5000,
});

function requireDb() {
  if (!connection) throw new Error('Database has not been initialized.');
  return connection;
}

function init(directory) {
  if (connection) return true;
  if (!directory) throw new Error('A database data directory is required.');
  dataDirectory = directory;
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const databasePath = path.join(directory, 'zaiken.db');
  connection = new Database(databasePath);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  connection.pragma('busy_timeout = 5000');
  connection.pragma('synchronous = NORMAL');
  migrate();
  migrateLegacyJson(directory);
  const check = connection.pragma('quick_check', { simple: true });
  if (check !== 'ok') throw new Error(`SQLite integrity check failed: ${check}`);
  return true;
}

function close() {
  if (connection) connection.close();
  connection = null;
  dataDirectory = null;
}

function init(directory) {
  if (connection) return true;

  if (!directory)
    throw new Error('A database data directory is required.');

  dataDirectory = directory;

  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700
  });

  const databasePath = path.join(directory, 'zaiken.db');

  connection = new Database(databasePath);

  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  connection.pragma('busy_timeout = 5000');
  connection.pragma('synchronous = NORMAL');

  migrate();
  migrateLegacyJson(directory);

  const check = connection.pragma(
    'quick_check',
    { simple:true }
  );

  if(check !== 'ok')
      throw new Error(`SQLite integrity check failed: ${check}`);

  return true;
}

function seedDefaults() {
  const db = requireDb();
  const stamp = now();
  db.prepare(`INSERT OR IGNORE INTO profiles(id,username,join_date,updated_at) VALUES('default','Player',?,?)`).run(stamp, stamp);
  db.prepare(`INSERT OR IGNORE INTO settings(id,data,updated_at) VALUES(1,?,?)`).run(JSON.stringify(DEFAULT_SETTINGS), stamp);
  const achievements = [
    ['headshot_king', 'Headshot King', 'Record 500 kills', '🎯', 500],
    ['first_blood', 'First Blood', 'Win your first recorded match', '🏆', 1],
    ['speed_demon', 'Speed Demon', 'Reach sub-150ms average reaction time', '⚡', 1],
    ['on_fire', 'On Fire', 'Reach a 10-win streak', '🔥', 10],
    ['diamond_elite', 'Diamond Elite', 'Reach Diamond rank', '💎', 1],
    ['marathon', 'Marathon', 'Play 1,000 hours', '🎮', 60000],
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO achievements(id,name,description,icon,goal) VALUES(?,?,?,?,?)');
  for (const row of achievements) insert.run(...row);
}

function legacyValue(directory, name) {
  const file = path.join(directory, `${name}.json`);
  if (!fs.existsSync(file)) return undefined;
  try { const parsed = JSON.parse(fs.readFileSync(file, 'utf8')); return parsed && parsed.data !== undefined ? parsed.data : parsed; } catch { return undefined; }
}

function migrateLegacyJson(directory) {
  const db = requireDb();
  if (db.prepare(`SELECT 1 FROM schema_migrations WHERE version = 2`).get()) return;
  const names = ['games', 'sessions', 'profile', 'achievements', 'settings', 'ai_reports', 'log_hashes', 'users', 'session'];
  if (!names.some((name) => fs.existsSync(path.join(directory, `${name}.json`)))) {
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(2,?)').run(now());
    return;
  }
  const backup = path.join(directory, 'migration-backups', `json-${Date.now()}`);
  fs.mkdirSync(backup, { recursive: true, mode: 0o700 });
  for (const name of names) { const source = path.join(directory, `${name}.json`); if (fs.existsSync(source)) fs.copyFileSync(source, path.join(backup, `${name}.json`)); }
  const tx = db.transaction(() => {
    for (const game of legacyValue(directory, 'games') || []) addGame(game);
    for (const session of legacyValue(directory, 'sessions') || []) {
      if (db.prepare('SELECT 1 FROM games WHERE id=?').get(session.gameId)) addSession(session.gameId, session.minutes, session);
    }
    const profile = legacyValue(directory, 'profile'); if (profile) saveProfile(profile);
    const settings = legacyValue(directory, 'settings'); if (settings && typeof settings === 'object') saveSettings(settings);
    for (const report of legacyValue(directory, 'ai_reports') || []) saveAIReport(report);
    for (const user of legacyValue(directory, 'users') || []) {
      if (user.email && user.passwordHash && user.salt) db.prepare('INSERT OR IGNORE INTO users(id,email,password_hash,salt,created_at) VALUES(?,?,?,?,?)').run(user.id || id(), text(user.email), user.passwordHash, user.salt, user.createdAt || now());
    }
    const session = legacyValue(directory, 'session'); if (session && session.currentUserId) setCurrentUserId(session.currentUserId);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(2,?)').run(now());
  });
  tx();
}

function gameDto(row) { return row && { id: row.id, name: row.name, genre: row.genre, exePath: row.executable_path, coverImage: row.cover_image, emoji: row.emoji, totalMinutes: row.total_minutes, lastPlayed: row.last_played_at, addedAt: row.created_at, kills: row.kills, deaths: row.deaths, wins: row.wins, losses: row.losses, matches: row.matches, notes: row.notes, logPath: row.log_path, steamAppId: row.app_id, platform: row.platform }; }
function profileDto(row) { return row && { id: row.id, username: row.username, avatar: row.avatar, rank: row.rank, level: row.level, xp: row.xp, xpMax: row.xp_max, wallet: row.wallet, joinDate: row.join_date, bio: row.bio, country: row.country, totalWins: row.total_wins, totalLosses: row.total_losses, totalKills: row.total_kills, totalDeaths: row.total_deaths, totalMatches: row.total_matches, winStreak: row.win_streak, bestWinStreak: row.best_win_streak, reactionTimeMs: row.reaction_time_ms, reactionSamples: row.reaction_samples }; }
function achievementDto(row) { return row && { id: row.id, name: row.name, desc: row.description, icon: row.icon, unlocked: Boolean(row.unlocked), unlockedAt: row.unlocked_at, progress: row.progress, goal: row.goal }; }

function getGames() { return requireDb().prepare('SELECT * FROM games ORDER BY last_played_at DESC, created_at DESC').all().map(gameDto); }
function addGame(input = {}) { const db = requireDb(); const stamp = now(); const row = { id: id(), name: text(input.name, 'New Game').slice(0, 160) || 'New Game', genre: text(input.genre, 'Unknown').slice(0, 80), executablePath: text(input.exePath).slice(0, 2048), coverImage: text(input.coverImage).slice(0, 2048), emoji: text(input.emoji, '🎮').slice(0, 16), platform: text(input.platform, 'custom').slice(0, 40), appId: input.steamAppId == null ? null : String(input.steamAppId).slice(0, 80), notes: text(input.notes).slice(0, 10000), logPath: text(input.logPath).slice(0, 2048), stamp }; db.prepare('INSERT INTO games(id,app_id,name,genre,executable_path,cover_image,emoji,platform,notes,log_path,created_at,updated_at) VALUES(@id,@appId,@name,@genre,@executablePath,@coverImage,@emoji,@platform,@notes,@logPath,@stamp,@stamp)').run(row); return gameDto(db.prepare('SELECT * FROM games WHERE id=?').get(row.id)); }
function updateGame(gameId, patch = {}) { const db = requireDb(); const current = db.prepare('SELECT * FROM games WHERE id=?').get(text(gameId)); if (!current) return null; const allowed = { name: ['name', 160], genre: ['genre', 80], exePath: ['executable_path', 2048], coverImage: ['cover_image', 2048], emoji: ['emoji', 16], platform: ['platform', 40], notes: ['notes', 10000], logPath: ['log_path', 2048], steamAppId: ['app_id', 80] }; const fields = []; const values = []; for (const [key, spec] of Object.entries(allowed)) if (Object.hasOwn(patch, key)) { fields.push(`${spec[0]}=?`); values.push(patch[key] == null && key === 'steamAppId' ? null : text(patch[key]).slice(0, spec[1])); } if (!fields.length) return gameDto(current); fields.push('updated_at=?'); values.push(now(), current.id); db.prepare(`UPDATE games SET ${fields.join(',')} WHERE id=?`).run(...values); return gameDto(db.prepare('SELECT * FROM games WHERE id=?').get(current.id)); }
function deleteGame(gameId) { return requireDb().prepare('DELETE FROM games WHERE id=?').run(text(gameId)).changes > 0; }

function addSession(gameId, minutes, stats = {}) { const db = requireDb(); const game = db.prepare('SELECT id FROM games WHERE id=?').get(text(gameId)); if (!game) throw new Error('Game not found.'); const stamp = now(); const row = { id: id(), gameId: game.id, minutes: nonNegativeInt(minutes), kills: nonNegativeInt(stats.kills), deaths: nonNegativeInt(stats.deaths), wins: nonNegativeInt(stats.wins), losses: nonNegativeInt(stats.losses), matches: nonNegativeInt(stats.matches), stamp }; const tx = db.transaction(() => { db.prepare('INSERT INTO play_sessions(id,game_id,minutes,kills,deaths,wins,losses,matches,started_at,ended_at,created_at) VALUES(@id,@gameId,@minutes,@kills,@deaths,@wins,@losses,@matches,@stamp,@stamp,@stamp)').run(row); db.prepare('UPDATE games SET total_minutes=total_minutes+@minutes,kills=kills+@kills,deaths=deaths+@deaths,wins=wins+@wins,losses=losses+@losses,matches=matches+@matches,last_played_at=@stamp,updated_at=@stamp WHERE id=@gameId').run(row); if (row.minutes) { const profile = getProfile(); let xp = profile.xp + row.minutes * 2, level = profile.level, xpMax = profile.xpMax; while (xp >= xpMax) { xp -= xpMax; level += 1; xpMax = Math.round(xpMax * 1.25); } db.prepare("UPDATE profiles SET xp=?,level=?,xp_max=?,rank=?,updated_at=? WHERE id='default'").run(xp, level, xpMax, rankFor({ ...profile, level }), stamp); } }); tx(); return { session: { id: row.id, gameId: row.gameId, minutes: row.minutes, date: stamp, kills: row.kills, deaths: row.deaths, wins: row.wins, losses: row.losses, matches: row.matches }, unlocked: evaluateAchievements() }; }
function getStats(gameId) { const db = requireDb(); const row = gameId ? db.prepare('SELECT COALESCE(SUM(minutes),0) minutes,COUNT(*) sessions FROM play_sessions WHERE game_id=?').get(text(gameId)) : db.prepare('SELECT COALESCE(SUM(minutes),0) minutes,COUNT(*) sessions FROM play_sessions').get(); const minutes = row.minutes; return { totalMinutes: minutes, totalHours: Math.round(minutes / 6) / 10, sessions: row.sessions, game: gameId ? gameDto(db.prepare('SELECT * FROM games WHERE id=?').get(text(gameId))) : null }; }
function getDailyStats(days = 7) { const safeDays = Math.min(365, Math.max(1, nonNegativeInt(days, 7))); const rows = requireDb().prepare("SELECT substr(ended_at,1,10) day,SUM(minutes) minutes,COUNT(*) sessions FROM play_sessions WHERE ended_at >= datetime('now', ?) GROUP BY day").all(`-${safeDays} days`); const map = new Map(rows.map((r) => [r.day, r])); return Array.from({ length: safeDays }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (safeDays - 1 - index)); const key = date.toISOString().slice(0, 10); const row = map.get(key); return { date: key, minutes: row ? row.minutes : 0, sessions: row ? row.sessions : 0 }; }); }

function getProfile() { return profileDto(requireDb().prepare("SELECT * FROM profiles WHERE id='default'").get()); }
function rankFor(profile) { const score = profile.totalWins * 3 + profile.totalKills * .5 + profile.level * 10; return score >= 5000 ? 'Master' : score >= 2500 ? 'Diamond' : score >= 1000 ? 'Platinum' : score >= 400 ? 'Gold' : score >= 100 ? 'Silver' : 'Bronze'; }
function saveProfile(input = {}) { const current = getProfile(); const merged = { ...current, ...input }; const db = requireDb(); db.prepare("UPDATE profiles SET username=?,avatar=?,rank=?,level=?,xp=?,xp_max=?,bio=?,country=?,total_wins=?,total_losses=?,total_kills=?,total_deaths=?,total_matches=?,win_streak=?,best_win_streak=?,reaction_time_ms=?,reaction_samples=?,updated_at=? WHERE id='default'").run(text(merged.username, 'Player').slice(0, 80) || 'Player', text(merged.avatar).slice(0, 2048), text(merged.rank, 'Bronze').slice(0, 32), Math.max(1, nonNegativeInt(merged.level, 1)), nonNegativeInt(merged.xp), Math.max(1, nonNegativeInt(merged.xpMax, 1000)), text(merged.bio).slice(0, 1000), text(merged.country).slice(0, 80), nonNegativeInt(merged.totalWins), nonNegativeInt(merged.totalLosses), nonNegativeInt(merged.totalKills), nonNegativeInt(merged.totalDeaths), nonNegativeInt(merged.totalMatches), nonNegativeInt(merged.winStreak), nonNegativeInt(merged.bestWinStreak), Math.max(0, number(merged.reactionTimeMs)), nonNegativeInt(merged.reactionSamples), now()); return getProfile(); }
function recordMatchResult(input = {}) { const p = getProfile(); const wins = nonNegativeInt(input.wins), losses = nonNegativeInt(input.losses), kills = nonNegativeInt(input.kills), deaths = nonNegativeInt(input.deaths), matches = nonNegativeInt(input.matches); const updated = { ...p, totalWins: p.totalWins + wins, totalLosses: p.totalLosses + losses, totalKills: p.totalKills + kills, totalDeaths: p.totalDeaths + deaths, totalMatches: p.totalMatches + matches, winStreak: wins ? p.winStreak + wins : losses ? 0 : p.winStreak, bestWinStreak: Math.max(p.bestWinStreak, wins ? p.winStreak + wins : p.winStreak), reactionTimeMs: number(input.reactionMs) > 0 ? ((p.reactionTimeMs * p.reactionSamples) + number(input.reactionMs)) / (p.reactionSamples + 1) : p.reactionTimeMs, reactionSamples: number(input.reactionMs) > 0 ? p.reactionSamples + 1 : p.reactionSamples, xp: p.xp + (wins * 50) + (kills * 5) + (matches * 10) }; updated.rank = rankFor(updated); saveProfile(updated); return { profile: getProfile(), xpGained: (wins * 50) + (kills * 5) + (matches * 10), unlocked: evaluateAchievements() }; }

function getAchievements() { return requireDb().prepare('SELECT * FROM achievements ORDER BY rowid').all().map(achievementDto); }
function unlockAchievement(achievementId) { const db = requireDb(); db.prepare('UPDATE achievements SET unlocked=1,progress=goal,unlocked_at=? WHERE id=?').run(now(), text(achievementId)); return achievementDto(db.prepare('SELECT * FROM achievements WHERE id=?').get(text(achievementId))); }
function updateAchievementProgress(achievementId, progress) { const db = requireDb(); const row = db.prepare('SELECT * FROM achievements WHERE id=?').get(text(achievementId)); if (!row) return null; const next = Math.min(row.goal, nonNegativeInt(progress)); db.prepare('UPDATE achievements SET progress=?,unlocked=?,unlocked_at=? WHERE id=?').run(next, next >= row.goal ? 1 : row.unlocked, next >= row.goal && !row.unlocked ? now() : row.unlocked_at, row.id); return achievementDto(db.prepare('SELECT * FROM achievements WHERE id=?').get(row.id)); }
function evaluateAchievements() { const db = requireDb(); const p = getProfile(); const minutes = db.prepare('SELECT COALESCE(SUM(minutes),0) value FROM play_sessions').get().value; const progress = { headshot_king: p.totalKills, first_blood: p.totalWins ? 1 : 0, speed_demon: p.reactionTimeMs > 0 && p.reactionTimeMs < 150 ? 1 : 0, on_fire: p.bestWinStreak, diamond_elite: ['Diamond', 'Master'].includes(p.rank) ? 1 : 0, marathon: minutes }; const result = []; for (const row of db.prepare('SELECT * FROM achievements WHERE unlocked=0').all()) { const value = progress[row.id]; if (value === undefined) continue; const updated = updateAchievementProgress(row.id, value); if (updated.unlocked) result.push(updated); } return result; }

function getSettings() { const row = requireDb().prepare('SELECT data FROM settings WHERE id=1').get(); try { return { ...DEFAULT_SETTINGS, ...JSON.parse(row.data) }; } catch { return { ...DEFAULT_SETTINGS }; } }
function saveSettings(input = {}) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object.'); const safe = { ...getSettings(), ...input }; delete safe.aiApiKey; delete safe.aiAppSecret; requireDb().prepare('UPDATE settings SET data=?,updated_at=? WHERE id=1').run(JSON.stringify(safe), now()); return safe; }
function getAIReports() { return requireDb().prepare('SELECT id,data,created_at FROM ai_reports ORDER BY created_at DESC').all().flatMap((row) => { try { return [{ id: row.id, ...JSON.parse(row.data), createdAt: row.created_at }]; } catch { return []; } }); }
function saveAIReport(report = {}) { const row = { id: text(report.id) || id(), data: JSON.stringify(report), stamp: now() }; const db = requireDb(); db.prepare('INSERT OR REPLACE INTO ai_reports(id,data,created_at) VALUES(@id,@data,@stamp)').run(row); db.prepare('DELETE FROM ai_reports WHERE id NOT IN (SELECT id FROM ai_reports ORDER BY created_at DESC LIMIT 90)').run(); return { id: row.id, ...report, createdAt: row.stamp }; }
function saveLogHash(entry = {}) { const db = requireDb(); const row = { id: id(), gameId: text(entry.gameId) || null, path: text(entry.path).slice(0, 4096), hash: text(entry.hash).slice(0, 128), size: nonNegativeInt(entry.size), timestamp: text(entry.timestamp, now()), stamp: now() }; if (!row.path || !row.hash) throw new Error('A log path and SHA-256 hash are required.'); db.prepare('INSERT INTO log_hashes(id,game_id,path,hash,size,timestamp,saved_at) VALUES(@id,@gameId,@path,@hash,@size,@timestamp,@stamp)').run(row); db.prepare('DELETE FROM log_hashes WHERE id NOT IN (SELECT id FROM log_hashes ORDER BY saved_at DESC LIMIT 1000)').run(); return entry; }
function getLogHashes(gameId, limit = 50) { const safeLimit = Math.min(1000, Math.max(1, nonNegativeInt(limit, 50))); const db = requireDb(); const rows = gameId ? db.prepare('SELECT * FROM log_hashes WHERE game_id=? ORDER BY saved_at DESC LIMIT ?').all(text(gameId), safeLimit) : db.prepare('SELECT * FROM log_hashes ORDER BY saved_at DESC LIMIT ?').all(safeLimit); return rows.reverse().map((row) => ({ id: row.id, gameId: row.game_id, path: row.path, hash: row.hash, size: row.size, timestamp: row.timestamp })); }
function verifyLogHash(filePath, expectedHash) { try { const actual = crypto.createHash('sha256').update(fs.readFileSync(text(filePath))).digest('hex'); return { ok: actual === expectedHash, actual, expected: expectedHash }; } catch (error) { return { ok: false, error: error.message }; } }

function findUserByEmail(email) { return requireDb().prepare('SELECT id,email,password_hash passwordHash,salt,created_at createdAt FROM users WHERE email=? COLLATE NOCASE').get(text(email).slice(0, 320)) || null; }
function getUserById(userId) { return requireDb().prepare('SELECT id,email,password_hash passwordHash,salt,created_at createdAt FROM users WHERE id=?').get(text(userId)) || null; }
function addUser({ email, passwordHash, salt }) { const row = { id: id(), email: text(email).toLowerCase().slice(0, 320), passwordHash: text(passwordHash), salt: text(salt), stamp: now() }; if (!row.email || !row.passwordHash || !row.salt) throw new Error('Invalid user record.'); requireDb().prepare('INSERT INTO users(id,email,password_hash,salt,created_at) VALUES(@id,@email,@passwordHash,@salt,@stamp)').run(row); return { id: row.id, email: row.email, createdAt: row.stamp }; }
function setCurrentUserId(userId) { const valid = userId ? getUserById(userId) : true; if (!valid) throw new Error('User not found.'); requireDb().prepare('UPDATE app_session SET current_user_id=? WHERE id=1').run(userId || null); return { currentUserId: userId || null }; }
function getCurrentUserId() { return requireDb().prepare('SELECT current_user_id currentUserId FROM app_session WHERE id=1').get().currentUserId || null; }
function resetAllData() { const db = requireDb(); db.transaction(() => { db.exec('DELETE FROM games; DELETE FROM ai_reports; DELETE FROM log_hashes;'); db.prepare('UPDATE achievements SET unlocked=0,unlocked_at=NULL,progress=0').run(); db.prepare("UPDATE profiles SET username='Player',avatar='',rank='Bronze',level=1,xp=0,xp_max=1000,wallet=0,bio='',country='',total_wins=0,total_losses=0,total_kills=0,total_deaths=0,total_matches=0,win_streak=0,best_win_streak=0,reaction_time_ms=0,reaction_samples=0,updated_at=? WHERE id='default'").run(now()); db.prepare('UPDATE settings SET data=?,updated_at=? WHERE id=1').run(JSON.stringify(DEFAULT_SETTINGS), now()); })(); return { ok: true }; }

// The outbox is append-only from the desktop perspective. A future sync worker
// batches pending rows, sends them to PostgreSQL, and marks only acknowledged
// IDs delivered. This preserves offline changes and makes retries idempotent.
function enqueueSyncChange(entityType, entityId, operation, payload = {}) { const validTypes = new Set(['game', 'session', 'profile', 'setting', 'achievement']); if (!validTypes.has(entityType) || !['upsert', 'delete'].includes(operation)) throw new Error('Invalid sync change.'); const row = { id: id(), entityType, entityId: text(entityId), operation, payload: JSON.stringify(payload), stamp: now() }; requireDb().prepare('INSERT INTO sync_outbox(id,entity_type,entity_id,operation,payload,occurred_at) VALUES(@id,@entityType,@entityId,@operation,@payload,@stamp)').run(row); return row.id; }
function getPendingSyncChanges(limit = 100) { const rows = requireDb().prepare('SELECT * FROM sync_outbox WHERE delivered_at IS NULL ORDER BY occurred_at LIMIT ?').all(Math.min(500, Math.max(1, nonNegativeInt(limit, 100)))); return rows.map((row) => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, operation: row.operation, payload: JSON.parse(row.payload), occurredAt: row.occurred_at, attempts: row.attempts })); }
function markSyncChangesDelivered(ids) { if (!Array.isArray(ids) || !ids.length) return 0; const statement = requireDb().prepare('UPDATE sync_outbox SET delivered_at=?,last_error=NULL WHERE id=?'); const tx = requireDb().transaction(() => ids.reduce((count, value) => count + statement.run(now(), text(value)).changes, 0)); return tx(); }
function recordSyncFailure(ids, error) { if (!Array.isArray(ids) || !ids.length) return 0; const statement = requireDb().prepare('UPDATE sync_outbox SET attempts=attempts+1,last_error=? WHERE id=?'); const message = text(error, 'Sync failed').slice(0, 1000); const tx = requireDb().transaction(() => ids.reduce((count, value) => count + statement.run(message, text(value)).changes, 0)); return tx(); }

module.exports = { init, close, getGames, addGame, updateGame, deleteGame, addSession, getStats, getDailyStats, getProfile, saveProfile, recordMatchResult, getAchievements, unlockAchievement, updateAchievementProgress, evaluateAchievements, getSettings, saveSettings, getAIReports, saveAIReport, saveLogHash, getLogHashes, verifyLogHash, findUserByEmail, getUserById, addUser, setCurrentUserId, getCurrentUserId, resetAllData, enqueueSyncChange, getPendingSyncChanges, markSyncChangesDelivered, recordSyncFailure };
