// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function uuidv4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}

const CURRENT_SCHEMA_VERSION = 3;

let DATA_DIR = '';
let INTEGRITY_SECRET = '';
const _cache = {};

function _loadOrCreateSecret(dataDir) {
  const secretPath = path.join(dataDir, '.integrity_secret');
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, secret, { encoding: 'utf8', mode: 0o600 });
    return secret;
  }
}

function init(dataDir) {
  DATA_DIR = dataDir;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  INTEGRITY_SECRET = _loadOrCreateSecret(DATA_DIR);
  _migrateIfNeeded();
  for (const [key, val] of Object.entries(_DEFAULTS)) {
    const fp = _fp(key);
    // Always write a deep copy, never the live _DEFAULTS reference itself —
    // otherwise later in-place mutations (push/property assignment) on the
    // cached value would silently corrupt _DEFAULTS for the rest of the
    // process's lifetime.
    if (!fs.existsSync(fp)) _write(key, JSON.parse(JSON.stringify(val)));
  }
}

function _fp(store) { return path.join(DATA_DIR, `${store}.json`); }

function _hmac(data) {
  return crypto.createHmac('sha256', INTEGRITY_SECRET).update(JSON.stringify(data)).digest('hex');
}

function _read(store) {
  if (_cache[store]) return _cache[store];
  try {
    const raw = fs.readFileSync(_fp(store), 'utf8');
    const envelope = JSON.parse(raw);
    if (envelope.__v !== undefined) {
      const { __v, __sig, ...payload } = envelope;
      const expected = _hmac({ data: payload.data, store, v: __v });
      if (__sig && __sig !== expected) {
        console.error(`[zaiken DB] Integrity failure on store "${store}" — resetting to default`);
        const fallback = JSON.parse(JSON.stringify(_DEFAULTS[store] ?? (Array.isArray(_DEFAULTS[store]) ? [] : {})));
        _cache[store] = fallback;
        return fallback;
      }
      _cache[store] = payload.data;
      return payload.data;
    }
    _cache[store] = envelope;
    return envelope;
  } catch {
    const fallback = JSON.parse(JSON.stringify(_DEFAULTS[store] ?? []));
    _cache[store] = fallback;
    return fallback;
  }
}

function _write(store, data) {
  const v = Date.now();
  const sig = _hmac({ data, store, v });
  const envelope = { __v: v, __sig: sig, data };
  fs.writeFileSync(_fp(store), JSON.stringify(envelope, null, 2), 'utf8');
  _cache[store] = data;
  return data;
}

function _migrateIfNeeded() {
  const metaPath = path.join(DATA_DIR, '_meta.json');
  let meta = { schemaVersion: 0 };
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch {}
  if (meta.schemaVersion < CURRENT_SCHEMA_VERSION) {
    meta.schemaVersion = CURRENT_SCHEMA_VERSION;
    meta.lastMigration = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }
}

const _DEFAULTS = {
  games: [],
  sessions: [],
  profile: {
    id: uuidv4(),
    username: 'Player',
    avatar: '',
    rank: 'Bronze',
    level: 1,
    xp: 0,
    xpMax: 1000,
    wallet: 0,
    joinDate: new Date().toISOString(),
    bio: '',
    country: '',
    totalWins: 0,
    totalLosses: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalMatches: 0,
    winStreak: 0,
    bestWinStreak: 0,
    reactionTimeMs: 0,
    reactionSamples: 0
  },
  achievements: [
    { id: 'headshot_king', name: 'Headshot King', desc: '500 headshots total', icon: '🎯', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 500 },
    { id: 'first_blood', name: 'First Blood', desc: 'Win your first recorded match', icon: '🏆', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 1 },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Sub-150ms avg reaction time', icon: '⚡', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 1 },
    { id: 'on_fire', name: 'On Fire', desc: '10-win streak', icon: '🔥', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 10 },
    { id: 'diamond_elite', name: 'Diamond Elite', desc: 'Reach Diamond rank', icon: '💎', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 1 },
    { id: 'global_threat', name: 'Global Threat', desc: 'Top 100 worldwide', icon: '🌍', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 1 },
    { id: 'marathon', name: 'Marathon', desc: '1000 hours total played', icon: '🎮', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 60000 },
    { id: 'team_player', name: 'Team Player', desc: '100 duo wins', icon: '🤝', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 100 },
    { id: 'analyst', name: 'Analyst', desc: 'Read 30 AI reports', icon: '📊', discount: 'Badge reward', unlocked: false, unlockedAt: null, progress: 0, goal: 30 }
  ],
  ai_reports: [],
  log_hashes: [],
  settings: {
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: '',
    aiBaseUrl: '',
    aiWebSearch: true,
    aiDailyGames: ['Valorant', 'Counter-Strike 2', 'League of Legends', 'Dota 2', 'Fortnite', 'Rocket League'],
    theme: 'dark', accentColor: '#00FFB2', overlayEnabled: true, overlayOpacity: 90,
    overlayPosition: 'top-right', showFPS: true, showPing: true, showCPUTemp: true,
    showGPU: true, showKD: true, showWinRate: true, aiTipsEnabled: true,
    powerSaveBlock: true, notifications: true, startWithWindows: false,
    minimizeToTray: true, language: 'en', currency: 'USD', anticheatEnabled: true,
    logMonitorEnabled: true, logMonitorInterval: 5000
  },
  users: [],
  session: { currentUserId: null }
};

function getGames() { return _read('games'); }

function addGame(game) {
  const games = _read('games');
  const newGame = {
    id: uuidv4(), name: game.name || 'New Game', genre: game.genre || 'Unknown',
    exePath: game.exePath || '', coverImage: game.coverImage || '', emoji: game.emoji || '🎮',
    totalMinutes: 0, lastPlayed: null, addedAt: new Date().toISOString(),
    kills: 0, deaths: 0, wins: 0, losses: 0, matches: 0, notes: game.notes || '',
    logPath: game.logPath || '', steamAppId: game.steamAppId || null, platform: game.platform || 'custom'
  };
  games.push(newGame);
  _write('games', games);
  return newGame;
}

function updateGame(id, data) {
  const games = _read('games');
  const idx = games.findIndex(g => g.id === id);
  if (idx === -1) return null;
  const forbidden = ['id', 'addedAt'];
  for (const k of forbidden) delete data[k];
  games[idx] = { ...games[idx], ...data };
  _write('games', games);
  return games[idx];
}

function deleteGame(id) {
  const games = _read('games').filter(g => g.id !== id);
  _write('games', games);
  const sessions = _read('sessions').filter(s => s.gameId !== id);
  _write('sessions', sessions);
  return true;
}

function addSession(gameId, minutes, stats = {}) {
  const sessions = _read('sessions');
  const mins = Math.max(0, Math.round(Number(minutes) || 0));
  const session = { id: uuidv4(), gameId, minutes: mins, date: new Date().toISOString(), ...stats };
  sessions.push(session);
  _write('sessions', sessions);
  const games = _read('games');
  const idx = games.findIndex(g => g.id === gameId);
  if (idx !== -1) {
    games[idx].totalMinutes = (games[idx].totalMinutes || 0) + mins;
    games[idx].lastPlayed = new Date().toISOString();
    if (stats.kills) games[idx].kills = (games[idx].kills || 0) + stats.kills;
    if (stats.deaths) games[idx].deaths = (games[idx].deaths || 0) + stats.deaths;
    if (stats.wins) games[idx].wins = (games[idx].wins || 0) + stats.wins;
    if (stats.losses) games[idx].losses = (games[idx].losses || 0) + stats.losses;
    if (stats.matches) games[idx].matches = (games[idx].matches || 0) + stats.matches;
    _write('games', games);
  }
  // Playtime XP: 2 XP per minute
  if (mins > 0) {
    const profile = _read('profile');
    profile.xp = (profile.xp || 0) + mins * 2;
    while (profile.xp >= (profile.xpMax || 1000)) {
      profile.xp -= profile.xpMax;
      profile.level = (profile.level || 1) + 1;
      profile.xpMax = Math.round((profile.xpMax || 1000) * 1.25);
    }
    profile.rank = _computeRank(profile);
    _write('profile', profile);
  }
  const unlocked = evaluateAchievements();
  return { session, unlocked };
}

function getStats(gameId) {
  const sessions = _read('sessions');
  const filtered = gameId ? sessions.filter(s => s.gameId === gameId) : sessions;
  const totalMinutes = filtered.reduce((a, s) => a + (s.minutes || 0), 0);
  const games = _read('games');
  const game = gameId ? games.find(g => g.id === gameId) : null;
  return { totalMinutes, totalHours: Math.round(totalMinutes / 60 * 10) / 10, sessions: filtered.length, game: game || null };
}

function getDailyStats(days = 7) {
  const sessions = _read('sessions');
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const day = sessions.filter(s => s.date && s.date.startsWith(dateStr));
    return { date: dateStr, minutes: day.reduce((a, s) => a + (s.minutes || 0), 0), sessions: day.length };
  });
}

function getProfile() { return _read('profile'); }

function saveProfile(data) {
  const forbidden = ['id', 'joinDate', 'wallet'];
  for (const k of forbidden) delete data[k];
  const profile = { ..._read('profile'), ...data };
  return _write('profile', profile);
}

function recordMatchResult({ wins = 0, losses = 0, kills = 0, deaths = 0, matches = 0, reactionMs = 0 } = {}) {
  const profile = _read('profile');
  profile.totalWins = (profile.totalWins || 0) + wins;
  profile.totalLosses = (profile.totalLosses || 0) + losses;
  profile.totalKills = (profile.totalKills || 0) + kills;
  profile.totalDeaths = (profile.totalDeaths || 0) + deaths;
  profile.totalMatches = (profile.totalMatches || 0) + matches;
  if (wins > 0) {
    profile.winStreak = (profile.winStreak || 0) + wins;
    if (profile.winStreak > (profile.bestWinStreak || 0)) profile.bestWinStreak = profile.winStreak;
  } else if (losses > 0) {
    profile.winStreak = 0;
  }
  if (reactionMs > 0 && reactionMs < 2000) {
    const samples = profile.reactionSamples || 0;
    profile.reactionTimeMs = samples === 0 ? reactionMs : Math.round(((profile.reactionTimeMs * samples) + reactionMs) / (samples + 1));
    profile.reactionSamples = samples + 1;
  }
  const xpGained = wins * 120 + kills * 10 + matches * 30;
  profile.xp = (profile.xp || 0) + xpGained;
  while (profile.xp >= profile.xpMax) {
    profile.xp -= profile.xpMax;
    profile.level = (profile.level || 1) + 1;
    profile.xpMax = Math.round(profile.xpMax * 1.25);
  }
  profile.rank = _computeRank(profile);
  _write('profile', profile);
  const unlocked = evaluateAchievements();
  return { profile, xpGained, unlocked };
}

function _computeRank(profile) {
  const score = (profile.totalWins || 0) * 3 + (profile.totalKills || 0) * 0.5 + (profile.level || 1) * 10;
  if (score >= 5000) return 'Master';
  if (score >= 2500) return 'Diamond';
  if (score >= 1000) return 'Platinum';
  if (score >= 400) return 'Gold';
  if (score >= 100) return 'Silver';
  return 'Bronze';
}

function getAchievements() { return _read('achievements'); }

function unlockAchievement(id) {
  const achievements = _read('achievements');
  const idx = achievements.findIndex(a => a.id === id);
  if (idx === -1) return null;
  achievements[idx].unlocked = true;
  achievements[idx].unlockedAt = new Date().toISOString();
  achievements[idx].progress = achievements[idx].goal;
  _write('achievements', achievements);
  return achievements[idx];
}

function updateAchievementProgress(id, progress) {
  const achievements = _read('achievements');
  const idx = achievements.findIndex(a => a.id === id);
  if (idx === -1) return null;
  achievements[idx].progress = Math.min(progress, achievements[idx].goal);
  if (!achievements[idx].unlocked && achievements[idx].progress >= achievements[idx].goal) {
    achievements[idx].unlocked = true;
    achievements[idx].unlockedAt = new Date().toISOString();
  }
  _write('achievements', achievements);
  return achievements[idx];
}


/**
 * Recompute achievement progress from current profile / sessions / reports.
 * Returns array of newly unlocked achievements.
 */
function evaluateAchievements() {
  const profile = _read('profile');
  const sessions = _read('sessions');
  const reports = _read('ai_reports');
  const totalMinutes = sessions.reduce((a, s) => a + (s.minutes || 0), 0);

  const progressMap = {
    headshot_king: profile.totalKills || 0,
    first_blood: (profile.totalWins || 0) >= 1 ? 1 : 0,
    speed_demon: (profile.reactionTimeMs > 0 && profile.reactionTimeMs < 150) ? 1 : 0,
    on_fire: profile.bestWinStreak || 0,
    diamond_elite: ['Diamond', 'Master'].includes(profile.rank) ? 1 : 0,
    global_threat: profile.rank === 'Master' ? 1 : 0,
    marathon: totalMinutes,
    team_player: profile.totalWins || 0,
    analyst: (reports && reports.length) || 0
  };

  const achievements = _read('achievements');
  const newly = [];
  for (const a of achievements) {
    if (a.unlocked) continue;
    if (progressMap[a.id] === undefined) continue;
    const next = Math.min(progressMap[a.id], a.goal);
    a.progress = next;
    if (next >= a.goal) {
      a.unlocked = true;
      a.unlockedAt = new Date().toISOString();
      newly.push({ id: a.id, name: a.name, discount: a.discount, icon: a.icon });
    }
  }
  _write('achievements', achievements);
  return newly;
}

function getSettings() { return _read('settings'); }

function saveSettings(data) {
  const settings = { ..._read('settings'), ...data };
  return _write('settings', settings);
}

function getAIReports() { return _read('ai_reports'); }

function saveAIReport(report) {
  const reports = _read('ai_reports');
  const newReport = { id: uuidv4(), ...report, createdAt: new Date().toISOString() };
  reports.unshift(newReport);
  if (reports.length > 90) reports.splice(90);
  _write('ai_reports', reports);
  return newReport;
}

function saveLogHash(entry) {
  const hashes = _read('log_hashes');
  hashes.push({ id: uuidv4(), ...entry, savedAt: new Date().toISOString() });
  if (hashes.length > 1000) hashes.splice(0, hashes.length - 1000);
  _write('log_hashes', hashes);
  return entry;
}

function getLogHashes(gameId, limit = 50) {
  const hashes = _read('log_hashes');
  return (gameId ? hashes.filter(h => h.gameId === gameId) : hashes).slice(-limit);
}

function verifyLogHash(filePath, expectedHash) {
  try {
    const content = fs.readFileSync(filePath);
    const actual = crypto.createHash('sha256').update(content).digest('hex');
    return { ok: actual === expectedHash, actual, expected: expectedHash };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Resets gameplay data back to defaults. Deliberately leaves `users` and
// `session` untouched so resetting your stats doesn't log you out.
function resetAllData() {
  const preserved = ['users', 'session'];
  for (const [key, val] of Object.entries(_DEFAULTS)) {
    if (preserved.includes(key)) continue;
    const fresh = JSON.parse(JSON.stringify(val));
    if (key === 'profile') fresh.id = uuidv4();
    _write(key, fresh);
  }
  return { ok: true };
}

// ---- Local authentication (no external service) ----

function getUsers() { return _read('users'); }

function findUserByEmail(email) {
  const norm = String(email || '').trim().toLowerCase();
  return getUsers().find(u => u.email.toLowerCase() === norm) || null;
}

function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

function addUser({ email, passwordHash, salt }) {
  const users = getUsers();
  const newUser = {
    id: uuidv4(),
    email: String(email).trim(),
    passwordHash,
    salt,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  _write('users', users);
  return newUser;
}

function getSession() { return _read('session'); }

function setCurrentUserId(id) {
  return _write('session', { currentUserId: id });
}

function getCurrentUserId() {
  return getSession().currentUserId || null;
}

module.exports = {
  init, getGames, addGame, updateGame, deleteGame, addSession,
  getStats, getDailyStats, getProfile, saveProfile,
  recordMatchResult, getAchievements, unlockAchievement, updateAchievementProgress, evaluateAchievements,
  getSettings, saveSettings, getAIReports, saveAIReport,
  saveLogHash, getLogHashes, verifyLogHash,
  findUserByEmail, getUserById, addUser, setCurrentUserId, getCurrentUserId,
  resetAllData
};

