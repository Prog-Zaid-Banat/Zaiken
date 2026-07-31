// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, globalShortcut, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
function uuidv4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

const authService = require('./src/main/services/auth');
const gamescanner = require('./src/main/services/gamescanner');
const systemstats = require('./src/main/services/systemstats');
const db = require('./src/main/database');
const { initCrashReporting, reportError } = require('./src/main/services/crash');
const { setupAutoUpdater } = require('./src/main/services/updater');
const aicoach = require('./src/main/services/aicoach');
const { initSecureLayer, stopSecureLayer, getSecurePreloadPath } = require('./src/main/secure-bootstrap');
const isDev = process.argv.includes('--dev');
const USER_DATA = app.getPath('userData');
const DB_PATH = path.join(USER_DATA, 'zaiken_data');
const COVERS_DIR = path.join(USER_DATA, 'covers');

const PRELOAD_PATH = getSecurePreloadPath();
const RENDERER_DIR = path.join(__dirname, 'src', 'renderer');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let powerBlockerId = null;
const logWatchers = new Map();
let overlayStatsTimer = null;
let activePlaySession = null; // { gameId, startedAt, exeName }


// Single-instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

db.init(DB_PATH);
fs.mkdirSync(COVERS_DIR, { recursive: true });

app.whenReady().then(async () => {
  await initSecureLayer();
  initCrashReporting();
  createMainWindow();
  createTray();
  registerGlobalShortcuts();
  setupAutoUpdater({ isDev, sendToRenderer: (channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
  }});
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });


process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  try { reportError(err, { tag: 'uncaughtException' }); } catch {}
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  try { reportError(reason, { tag: 'unhandledRejection' }); } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  stopSecureLayer();
  globalShortcut.unregisterAll();
  if (powerBlockerId !== null) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
  for (const [, watcher] of logWatchers) {
    try { watcher.close(); } catch {}
  }
  logWatchers.clear();
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0A0C10',
    show: false,
    icon: _getIcon(),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: isDev
    }
  });

  const indexPath = path.join(RENDERER_DIR, 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('Failed to load index.html:', indexPath, err);
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('minimize', () => {
    try {
      const settings = db.getSettings();
      if (settings && settings.minimizeToTray && mainWindow) mainWindow.hide();
    } catch {}
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('did-fail-load', code, desc, url);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('render-process-gone', details);
  });
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  const { width } = display.workAreaSize;
  overlayWindow = new BrowserWindow({
    width: 560,
    height: 58,
    x: width - 580,
    y: 16,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  overlayWindow.loadFile(path.join(RENDERER_DIR, 'overlay.html')).catch((err) => {
    console.error('Failed to load overlay.html:', err);
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.show();
  });
  overlayWindow.on('closed', () => {
    overlayWindow = null;
    _stopOverlayStatsFeed();
  });
  _startOverlayStatsFeed();
}

function _startOverlayStatsFeed() {
  _stopOverlayStatsFeed();
  const push = async () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    try {
      let kd = null;
      let winRate = null;
      try {
        const profile = db.getProfile();
        if (profile) {
          const deaths = profile.totalDeaths || 0;
          const kills = profile.totalKills || 0;
          kd = deaths > 0 ? (kills / deaths) : kills;
          const matches = profile.totalMatches || 0;
          winRate = matches > 0 ? Math.round((profile.totalWins || 0) / matches * 100) : null;
        }
      } catch {}
      const snap = await systemstats.collectSnapshot({ kd, winRate });
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('overlay-update', snap);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-stats', snap);
      }
    } catch (e) {
      console.warn('overlay stats:', e.message);
    }
  };
  push();
  overlayStatsTimer = setInterval(push, 2000);
}

function _stopOverlayStatsFeed() {
  if (overlayStatsTimer) {
    clearInterval(overlayStatsTimer);
    overlayStatsTimer = null;
  }
}


function createTray() {
  const empty = nativeImage.createEmpty();
  try {
    tray = new Tray(_getIcon());
  } catch {
    tray = new Tray(empty);
  }
  const menu = Menu.buildFromTemplate([
    { label: 'Zaiken ' + app.getVersion(), enabled: false },
    { type: 'separator' },
    {
      label: 'Open',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createMainWindow();
      }
    },
    { label: 'Toggle Overlay (Ctrl+Shift+O)', click: _toggleOverlay },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => mainWindow && mainWindow.webContents.send('navigate', 'settings')
    },
    { type: 'separator' },
    { label: 'Quit Zaiken', click: () => app.quit() }
  ]);
  tray.setToolTip('Zaiken');
  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createMainWindow();
  });
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.register('CommandOrControl+Shift+O', _toggleOverlay);
    globalShortcut.register('CommandOrControl+Shift+N', () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
  } catch (e) {
    console.warn('Global shortcut registration failed:', e.message);
  }
}

function _toggleOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  } else {
    createOverlayWindow();
  }
}

function _getIcon() {
  const base = path.join(__dirname, 'assets', 'icons');
  if (process.platform === 'win32' && fs.existsSync(path.join(base, 'icon.ico'))) {
    return path.join(base, 'icon.ico');
  }
  if (process.platform === 'darwin' && fs.existsSync(path.join(base, 'icon.icns'))) {
    return path.join(base, 'icon.icns');
  }
  const png = path.join(base, 'icon.png');
  if (fs.existsSync(png)) return png;
  return nativeImage.createEmpty();
}

// ---- Window controls ----
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => {
  if (!mainWindow) return;
  try {
    const s = db.getSettings();
    if (s && s.minimizeToTray) mainWindow.hide();
    else mainWindow.close();
  } catch {
    mainWindow.close();
  }
});
ipcMain.on('window-quit', () => app.quit());
ipcMain.on('toggle-overlay', _toggleOverlay);
ipcMain.on('open-external', (_, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
});
ipcMain.on('open-folder', (_, p) => {
  if (p && fs.existsSync(p)) shell.openPath(p);
});
ipcMain.on('power-save-start', () => {
  if (powerBlockerId === null) powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
});
ipcMain.on('power-save-stop', () => {
  if (powerBlockerId !== null) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
});
ipcMain.on('overlay-send', (_, data) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay-update', data);
  }
});

// ---- Dialogs / system ----
ipcMain.handle('pick-exe', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Executable',
    filters: [
      { name: 'Executables', extensions: ['exe', 'bat', 'sh', 'app', 'AppImage'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('pick-image', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Cover Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  });
  if (r.canceled) return null;
  const src = r.filePaths[0];
  const ext = path.extname(src);
  const dest = path.join(COVERS_DIR, uuidv4() + ext);
  fs.copyFileSync(src, dest);
  return dest;
});

ipcMain.handle('pick-log', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Log File',
    filters: [
      { name: 'Log Files', extensions: ['log', 'txt', 'csv', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('launch-game', async (_, exePath) => {
  if (!exePath) return { ok: false, error: 'No path provided' };
  if (!fs.existsSync(exePath)) return { ok: false, error: 'File not found: ' + exePath };
  try {
    await shell.openPath(exePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('scan-games', async () => {
  try {
    return await gamescanner.scanInstalledGames();
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('hash-log-file', async (_, logPath, gameId) => {
  if (!logPath || !fs.existsSync(logPath)) return { ok: false, error: 'File not found' };
  try {
    const content = fs.readFileSync(logPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const size = content.length;
    db.saveLogHash({ gameId, path: logPath, hash, size, timestamp: new Date().toISOString() });
    return { ok: true, hash, size };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('verify-log-hash', async (_, logPath, expectedHash) => db.verifyLogHash(logPath, expectedHash));

ipcMain.handle('read-log-tail', async (_, logPath, lines = 100) => {
  if (!logPath || !fs.existsSync(logPath)) return { ok: false, error: 'File not found' };
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const allLines = content.split('\n').filter(Boolean);
    const tail = allLines.slice(-lines);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { ok: true, lines: tail, totalLines: allLines.length, hash };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('start-log-watch', (_, logPath, gameId) => {
  if (!logPath || !fs.existsSync(logPath)) return { ok: false, error: 'File not found' };
  if (logWatchers.has(logPath)) return { ok: true, already: true };
  try {
    let lastHash = '';
    const watcher = fs.watch(logPath, { persistent: false }, () => {
      try {
        const content = fs.readFileSync(logPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        if (hash !== lastHash) {
          lastHash = hash;
          db.saveLogHash({
            gameId,
            path: logPath,
            hash,
            size: content.length,
            timestamp: new Date().toISOString()
          });
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('log-changed', { logPath, gameId, hash });
          }
        }
      } catch {}
    });
    logWatchers.set(logPath, watcher);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('stop-log-watch', (_, logPath) => {
  const w = logWatchers.get(logPath);
  if (w) {
    try { w.close(); } catch {}
    logWatchers.delete(logPath);
  }
  return { ok: true };
});

ipcMain.handle('app-get-version', () => app.getVersion());
ipcMain.handle('app-get-path', (_, name) => {
  try { return app.getPath(name); } catch { return null; }
});

// ---- Database IPC ----
ipcMain.handle('db-get-games', () => db.getGames());
ipcMain.handle('db-add-game', (_, g) => db.addGame(g));
ipcMain.handle('db-update-game', (_, id, data) => db.updateGame(id, data));
ipcMain.handle('db-delete-game', (_, id) => db.deleteGame(id));
ipcMain.handle('db-add-session', (_, gameId, minutes, stats) => db.addSession(gameId, minutes, stats));
ipcMain.handle('db-get-stats', (_, gameId) => db.getStats(gameId));
ipcMain.handle('db-get-daily-stats', (_, days) => db.getDailyStats(days));
ipcMain.handle('db-get-profile', () => db.getProfile());
ipcMain.handle('db-save-profile', (_, data) => db.saveProfile(data));
ipcMain.handle('db-record-match', (_, data) => db.recordMatchResult(data));
ipcMain.handle('db-get-achievements', () => db.getAchievements());
ipcMain.handle('db-unlock-achievement', (_, id) => db.unlockAchievement(id));
ipcMain.handle('db-update-achievement-progress', (_, id, progress) => db.updateAchievementProgress(id, progress));
ipcMain.handle('db-get-settings', () => db.getSettings());
ipcMain.handle('db-save-settings', (_, data) => db.saveSettings(data));
ipcMain.handle('db-reset-all-data', () => db.resetAllData());
ipcMain.handle('db-get-ai-reports', () => db.getAIReports());
ipcMain.handle('db-save-ai-report', (_, r) => db.saveAIReport(r));

// ---- AI Coach (cloud LLM) ----
ipcMain.handle('ai-status', () => aicoach.getStatus(db));
ipcMain.handle('ai-ask', async (_, payload) => {
  try {
    return await aicoach.askCoach(db, payload || {});
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('ai-daily-report', async (_, gameName) => {
  try {
    return await aicoach.generateDailyReport(db, gameName);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('ai-daily-reports-batch', async (_, games) => {
  try {
    return await aicoach.generateDailyReportsBatch(db, games);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('db-get-log-hashes', (_, gameId, limit) => db.getLogHashes(gameId, limit));


// ---- Live system stats / play sessions ----
ipcMain.handle('system-get-stats', async () => systemstats.collectSnapshot());

ipcMain.handle('session-start', (_, payload = {}) => {
  activePlaySession = {
    gameId: payload.gameId || null,
    exeName: payload.exeName || null,
    startedAt: Date.now()
  };
  return { ok: true, session: activePlaySession };
});

ipcMain.handle('session-get', () => activePlaySession);

ipcMain.handle('session-end', (_, payload = {}) => {
  if (!activePlaySession && !payload.gameId) {
    return { ok: false, error: 'No active session' };
  }
  const startedAt = (activePlaySession && activePlaySession.startedAt) || payload.startedAt || Date.now();
  const gameId = payload.gameId || (activePlaySession && activePlaySession.gameId);
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  activePlaySession = null;
  if (!gameId) return { ok: false, error: 'Missing gameId', minutes };
  const result = db.addSession(gameId, minutes, payload.stats || {});
  if (powerBlockerId !== null) {
    try { powerSaveBlocker.stop(powerBlockerId); } catch {}
    powerBlockerId = null;
  }
  return { ok: true, minutes, ...result };
});

ipcMain.handle('db-evaluate-achievements', () => db.evaluateAchievements());

// ---- Auth IPC ----
ipcMain.handle('auth-register', async (_, email, password) => {
  try {
    return await authService.register(email, password);
  } catch (e) {
    throw new Error(e.message || 'Registration failed');
  }
});
ipcMain.handle('auth-login', async (_, email, password) => {
  try {
    return await authService.login(email, password);
  } catch (e) {
    throw new Error(e.message || 'Login failed');
  }
});
ipcMain.handle('auth-logout', () => authService.logout());
ipcMain.handle('auth-current-user', async () => {
  const user = await authService.getCurrentUser();
  return user ? { uid: user.uid, email: user.email } : null;
});
