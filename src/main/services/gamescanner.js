// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
// Playnite-style multi-source library scanner (local installs only, no ToS bypass).
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../database');

const STEAM_PATHS_WIN = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common',
  'C:\\Program Files\\Steam\\steamapps\\common',
  path.join(os.homedir(), 'Steam\\steamapps\\common')
];
const EPIC_PATHS_WIN = [
  'C:\\Program Files\\Epic Games',
  'C:\\Program Files (x86)\\Epic Games'
];
const GOG_PATHS_WIN = [
  'C:\\Program Files (x86)\\GOG Galaxy\\Games',
  'C:\\Program Files\\GOG Galaxy\\Games'
];

const EPIC_MANIFEST_DIRS = [
  'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests',
  path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
];

const WELL_KNOWN_GAMES = [
  { name: 'Counter-Strike 2', folder: 'Counter-Strike Global Offensive', exe: 'cs2.exe', genre: 'FPS', emoji: '🌐', platform: 'steam', steamAppId: 730 },
  { name: 'Apex Legends', folder: 'Apex Legends', exe: 'r5apex.exe', genre: 'Battle Royale', emoji: '🎯', platform: 'ea', steamAppId: 1172470 },
  { name: 'Valorant', folder: 'VALORANT', exe: 'VALORANT.exe', genre: 'Tactical FPS', emoji: '⚔️', platform: 'riot', steamAppId: null },
  { name: 'Fortnite', folder: 'Fortnite', exe: 'FortniteClient-Win64-Shipping.exe', genre: 'Battle Royale', emoji: '🏗️', platform: 'epic', steamAppId: null },
  { name: 'Rocket League', folder: 'rocketleague', exe: 'RocketLeague.exe', genre: 'Sports', emoji: '🏎️', platform: 'epic', steamAppId: null },
  { name: 'Overwatch 2', folder: 'Overwatch', exe: 'Overwatch.exe', genre: 'Hero Shooter', emoji: '🦸', platform: 'battle', steamAppId: null },
  { name: 'League of Legends', folder: 'League of Legends', exe: 'LeagueClient.exe', genre: 'MOBA', emoji: '🗡️', platform: 'riot', steamAppId: null },
  { name: 'Dota 2', folder: 'dota 2 beta', exe: 'dota2.exe', genre: 'MOBA', emoji: '🧙', platform: 'steam', steamAppId: 570 },
  { name: 'Minecraft', folder: 'Minecraft Launcher', exe: 'MinecraftLauncher.exe', genre: 'Survival', emoji: '⛏️', platform: 'microsoft', steamAppId: null },
  { name: 'PUBG', folder: 'PUBG', exe: 'TslGame.exe', genre: 'Battle Royale', emoji: '🔫', platform: 'steam', steamAppId: 578080 },
  { name: 'Warframe', folder: 'Warframe', exe: 'Warframe.x64.exe', genre: 'Action', emoji: '🌌', platform: 'steam', steamAppId: 230410 }
];

const SKIP_NAME_RE = /epic online services|directx|redist|launcher|prereq|unrealengine|easyanticheat|dotnet|vc_redist|crashreport/i;

function _emojiFor(name) {
  const n = String(name || '').toLowerCase();
  if (/warframe/.test(n)) return '🌌';
  if (/fortnite/.test(n)) return '🏗️';
  if (/rocket/.test(n)) return '🏎️';
  if (/counter|cs2/.test(n)) return '🌐';
  if (/valorant/.test(n)) return '⚔️';
  if (/dota/.test(n)) return '🧙';
  if (/gta|grand theft/.test(n)) return '🚗';
  if (/minecraft/.test(n)) return '⛏️';
  return '🎮';
}

function _scanPlatformPaths(basePaths, gameInfo) {
  for (const base of basePaths) {
    if (!fs.existsSync(base)) continue;
    const gamePath = path.join(base, gameInfo.folder);
    if (fs.existsSync(gamePath)) {
      const exePath = path.join(gamePath, gameInfo.exe);
      if (fs.existsSync(exePath)) return exePath;
      try {
        const entries = fs.readdirSync(gamePath, { withFileTypes: true });
        for (const e of entries) {
          if (e.isFile() && e.name.toLowerCase().endsWith('.exe') && !/unins|crash|report|redist/i.test(e.name)) {
            return path.join(gamePath, e.name);
          }
        }
      } catch { /* skip */ }
    }
  }
  return null;
}

function _readSteamLibraryPaths() {
  const libs = [];
  const candidates = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf',
    'C:\\Program Files\\Steam\\steamapps\\libraryfolders.vdf'
  ];
  for (const steamLibVdf of candidates) {
    try {
      if (!fs.existsSync(steamLibVdf)) continue;
      const content = fs.readFileSync(steamLibVdf, 'utf8');
      const pathMatches = content.match(/"path"\s+"([^"]+)"/g) || [];
      for (const match of pathMatches) {
        const libPath = match.replace(/"path"\s+"/, '').replace(/"$/, '').replace(/\\\\/g, '\\');
        const appsPath = path.join(libPath, 'steamapps', 'common');
        if (fs.existsSync(appsPath)) libs.push(appsPath);
        const steamapps = path.join(libPath, 'steamapps');
        if (fs.existsSync(steamapps)) libs.push(steamapps);
      }
    } catch { /* ignore */ }
  }
  return [...new Set(libs)];
}

/** Parse a simple Steam .acf / .vdf key-value blob */
function _parseAcf(content) {
  const out = {};
  const re = /"([^"]+)"\s+"([^"]*)"/g;
  let m;
  while ((m = re.exec(content))) out[m[1].toLowerCase()] = m[2];
  return out;
}

/**
 * Enumerate Steam games from appmanifest_*.acf across all libraries.
 */
function scanSteamGames() {
  const found = [];
  if (process.platform !== 'win32') return found;

  const steamappsDirs = new Set();
  for (const p of [
    'C:\\Program Files (x86)\\Steam\\steamapps',
    'C:\\Program Files\\Steam\\steamapps'
  ]) {
    if (fs.existsSync(p)) steamappsDirs.add(p);
  }
  for (const lib of _readSteamLibraryPaths()) {
    if (lib.toLowerCase().endsWith('steamapps')) steamappsDirs.add(lib);
    else if (lib.toLowerCase().endsWith('common')) steamappsDirs.add(path.dirname(lib));
  }

  for (const steamapps of steamappsDirs) {
    let files = [];
    try { files = fs.readdirSync(steamapps); } catch { continue; }
    for (const file of files) {
      if (!/^appmanifest_\d+\.acf$/i.test(file)) continue;
      try {
        const raw = fs.readFileSync(path.join(steamapps, file), 'utf8');
        const kv = _parseAcf(raw);
        const name = kv.name || kv.installdir;
        const installdir = kv.installdir;
        const appid = kv.appid;
        if (!name || !installdir) continue;
        if (SKIP_NAME_RE.test(name)) continue;
        const common = path.join(steamapps, 'common', installdir);
        if (!fs.existsSync(common)) continue;
        const exePath = _findBestExe(common, name);
        if (!exePath) continue;
        found.push({
          name,
          genre: 'Steam',
          emoji: _emojiFor(name),
          platform: 'steam',
          steamAppId: appid ? Number(appid) : null,
          exePath,
          installPath: common,
          source: 'steam-manifest'
        });
      } catch { /* skip bad manifest */ }
    }
  }
  return found;
}

/**
 * Epic Launcher .item manifests under ProgramData — covers almost all Epic installs.
 */
function scanEpicGames() {
  const found = [];
  if (process.platform !== 'win32') return found;

  const dirs = [...new Set(EPIC_MANIFEST_DIRS)];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let files = [];
    try { files = fs.readdirSync(dir); } catch { continue; }
    for (const file of files) {
      if (!/\.item$/i.test(file) && !/\.json$/i.test(file)) continue;
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        const data = JSON.parse(raw);
        const name = data.DisplayName || data.AppName || data.Name;
        const installLocation = data.InstallLocation || data.InstallPath;
        const launchExe = data.LaunchExecutable || data.LaunchCommand || '';
        if (!name || !installLocation) continue;
        if (SKIP_NAME_RE.test(name)) continue;
        if (!fs.existsSync(installLocation)) continue;

        let exePath = null;
        if (launchExe) {
          const candidate = path.isAbsolute(launchExe)
            ? launchExe
            : path.join(installLocation, launchExe.replace(/^\.\//, '').replace(/\//g, path.sep));
          if (fs.existsSync(candidate) && /\.exe$/i.test(candidate)) exePath = candidate;
        }
        if (!exePath) exePath = _findBestExe(installLocation, name);
        if (!exePath) continue;

        found.push({
          name,
          genre: 'Epic',
          emoji: _emojiFor(name),
          platform: 'epic',
          steamAppId: null,
          exePath,
          installPath: installLocation,
          source: 'epic-manifest',
          catalogId: data.CatalogItemId || data.AppName || null
        });
      } catch { /* skip */ }
    }
  }

  // Fallback: folders under Epic Games directory
  for (const base of EPIC_PATHS_WIN) {
    if (!fs.existsSync(base)) continue;
    let entries = [];
    try { entries = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_NAME_RE.test(e.name)) continue;
      const gamePath = path.join(base, e.name);
      const exePath = _findBestExe(gamePath, e.name);
      if (!exePath) continue;
      found.push({
        name: e.name,
        genre: 'Epic',
        emoji: _emojiFor(e.name),
        platform: 'epic',
        steamAppId: null,
        exePath,
        installPath: gamePath,
        source: 'epic-folder'
      });
    }
  }
  return found;
}

function scanGogGames() {
  const found = [];
  if (process.platform !== 'win32') return found;
  for (const base of GOG_PATHS_WIN) {
    if (!fs.existsSync(base)) continue;
    let entries = [];
    try { entries = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const gamePath = path.join(base, e.name);
      const exePath = _findBestExe(gamePath, e.name);
      if (!exePath) continue;
      found.push({
        name: e.name,
        genre: 'GOG',
        emoji: _emojiFor(e.name),
        platform: 'gog',
        steamAppId: null,
        exePath,
        installPath: gamePath,
        source: 'gog-folder'
      });
    }
  }
  return found;
}

function _findBestExe(rootDir, gameName) {
  const preferred = [];
  const others = [];
  const maxDepth = 3;

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/redist|engine|plugins|binaries\\win64_shipping_server/i.test(full)) continue;
        walk(full, depth + 1);
      } else if (e.isFile() && /\.exe$/i.test(e.name)) {
        if (/unins|crash|report|redist|setup|installer|vcredist|unitycrash|cefsharp|dotnet/i.test(e.name)) continue;
        const scoreName = gameName ? e.name.toLowerCase().includes(String(gameName).toLowerCase().slice(0, 6)) : false;
        const isShipping = /shipping|win64|win32/i.test(e.name);
        if (scoreName || isShipping) preferred.push(full);
        else others.push(full);
      }
    }
  }

  // Prefer common Unreal/Unity binary folders first
  for (const sub of ['Binaries\\Win64', 'binaries\\win64', 'Binaries', '']) {
    const p = sub ? path.join(rootDir, sub) : rootDir;
    if (fs.existsSync(p)) walk(p, 0);
  }
  if (preferred.length) return preferred[0];
  if (others.length) return others[0];
  return null;
}

function scanWellKnown() {
  const found = [];
  if (process.platform !== 'win32') return found;
  const extraSteam = _readSteamLibraryPaths().filter(p => p.toLowerCase().includes('common'));
  for (const gameInfo of WELL_KNOWN_GAMES) {
    let exePath = null;
    if (gameInfo.platform === 'steam') {
      exePath = _scanPlatformPaths([...STEAM_PATHS_WIN, ...extraSteam], gameInfo);
    } else if (gameInfo.platform === 'epic') {
      exePath = _scanPlatformPaths(EPIC_PATHS_WIN, gameInfo);
    } else {
      exePath = _scanPlatformPaths(
        [...STEAM_PATHS_WIN, ...EPIC_PATHS_WIN, ...GOG_PATHS_WIN, ...extraSteam],
        gameInfo
      );
    }
    if (exePath) {
      found.push({
        ...gameInfo,
        exePath,
        installPath: path.dirname(exePath),
        source: 'well-known'
      });
    }
  }
  return found;
}

function _dedupeKey(g) {
  return (g.exePath || '').toLowerCase().replace(/\//g, '\\');
}

/**
 * Unified scan: Epic manifests + Steam manifests + GOG folders + well-known fallbacks.
 * Skips games already in the local Zaiken library.
 */
async function scanInstalledGames() {
  const found = [];
  if (process.platform !== 'win32') return found;

  const existingGames = db.getGames();
  const existingPaths = new Set(
    existingGames.map(g => (g.exePath || '').toLowerCase().replace(/\//g, '\\')).filter(Boolean)
  );
  const existingNames = new Set(
    existingGames.map(g => (g.name || '').toLowerCase().trim()).filter(Boolean)
  );

  const buckets = [
    ...scanEpicGames(),
    ...scanSteamGames(),
    ...scanGogGames(),
    ...scanWellKnown()
  ];

  const seen = new Set();
  for (const g of buckets) {
    const key = _dedupeKey(g);
    if (!key || seen.has(key)) continue;
    if (existingPaths.has(key)) continue;
    // Allow same name only if path differs and not already imported
    const nameKey = (g.name || '').toLowerCase().trim();
    if (nameKey && existingNames.has(nameKey)) continue;
    seen.add(key);
    found.push(g);
  }

  // Prefer nicer sort: alphabetical
  found.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return found;
}

module.exports = {
  scanInstalledGames,
  scanEpicGames,
  scanSteamGames,
  scanGogGames,
  WELL_KNOWN_GAMES
};
