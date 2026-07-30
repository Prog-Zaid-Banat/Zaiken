// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zaiken', {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    quit: () => ipcRenderer.send('window-quit'),
    toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
  },
  system: {
    openExternal: (url) => ipcRenderer.send('open-external', url),
    openFolder: (p) => ipcRenderer.send('open-folder', p),
    powerSaveStart: () => ipcRenderer.send('power-save-start'),
    powerSaveStop: () => ipcRenderer.send('power-save-stop'),
    pickExe: () => ipcRenderer.invoke('pick-exe'),
    pickImage: () => ipcRenderer.invoke('pick-image'),
    pickLog: () => ipcRenderer.invoke('pick-log'),
    launchGame: (exePath) => ipcRenderer.invoke('launch-game', exePath),
    scanGames: () => ipcRenderer.invoke('scan-games'),
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    getPath: (name) => ipcRenderer.invoke('app-get-path', name),
    sendOverlay: (data) => ipcRenderer.send('overlay-send', data),
    getStats: () => ipcRenderer.invoke('system-get-stats'),
  },
  session: {
    start: (payload) => ipcRenderer.invoke('session-start', payload),
    get: () => ipcRenderer.invoke('session-get'),
    end: (payload) => ipcRenderer.invoke('session-end', payload),
  },
  logs: {
    hashFile: (logPath, gameId) => ipcRenderer.invoke('hash-log-file', logPath, gameId),
    verifyHash: (logPath, expectedHash) => ipcRenderer.invoke('verify-log-hash', logPath, expectedHash),
    readTail: (logPath, lines) => ipcRenderer.invoke('read-log-tail', logPath, lines),
    startWatch: (logPath, gameId) => ipcRenderer.invoke('start-log-watch', logPath, gameId),
    stopWatch: (logPath) => ipcRenderer.invoke('stop-log-watch', logPath),
    getHashes: (gameId, limit) => ipcRenderer.invoke('db-get-log-hashes', gameId, limit),
  },
  onNavigate: (cb) => ipcRenderer.on('navigate', (_, page) => cb(page)),
  onLogChanged: (cb) => ipcRenderer.on('log-changed', (_, data) => cb(data)),
  onSystemStats: (cb) => ipcRenderer.on('system-stats', (_, data) => cb(data)),
  onOverlayUpdate: (cb) => ipcRenderer.on('overlay-update', (_, data) => cb(data)),
  games: {
    getAll: () => ipcRenderer.invoke('db-get-games'),
    add: (game) => ipcRenderer.invoke('db-add-game', game),
    update: (id, data) => ipcRenderer.invoke('db-update-game', id, data),
    delete: (id) => ipcRenderer.invoke('db-delete-game', id),
    addSession: (gameId, minutes, stats) => ipcRenderer.invoke('db-add-session', gameId, minutes, stats),
  },
  stats: {
    getForGame: (gameId) => ipcRenderer.invoke('db-get-stats', gameId),
    getDaily: (days) => ipcRenderer.invoke('db-get-daily-stats', days),
  },
  profile: {
    get: () => ipcRenderer.invoke('db-get-profile'),
    save: (data) => ipcRenderer.invoke('db-save-profile', data),
    recordMatch: (data) => ipcRenderer.invoke('db-record-match', data),
  },
  achievements: {
    getAll: () => ipcRenderer.invoke('db-get-achievements'),
    unlock: (id) => ipcRenderer.invoke('db-unlock-achievement', id),
    updateProgress: (id, progress) => ipcRenderer.invoke('db-update-achievement-progress', id, progress),
    evaluate: () => ipcRenderer.invoke('db-evaluate-achievements'),
  },
  settings: {
    get: () => ipcRenderer.invoke('db-get-settings'),
    save: (data) => ipcRenderer.invoke('db-save-settings', data),
    resetAllData: () => ipcRenderer.invoke('db-reset-all-data'),
  },
  ai: {
    status: () => ipcRenderer.invoke('ai-status'),
    ask: (payload) => ipcRenderer.invoke('ai-ask', payload),
    dailyReport: (gameName) => ipcRenderer.invoke('ai-daily-report', gameName),
    dailyReportsBatch: (games) => ipcRenderer.invoke('ai-daily-reports-batch', games),
    getReports: () => ipcRenderer.invoke('db-get-ai-reports'),
    saveReport: (r) => ipcRenderer.invoke('db-save-ai-report', r),
  },
  auth: {
    register: (email, password) => ipcRenderer.invoke('auth-register', email, password),
    login: (email, password) => ipcRenderer.invoke('auth-login', email, password),
    logout: () => ipcRenderer.invoke('auth-logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth-current-user'),
  },
});
