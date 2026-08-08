"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
console.log("🔥 ZAiken preload executing");
const electron_1 = require("electron");
const zaikenAPI = {
    window: {
        minimize: () => {
            electron_1.ipcRenderer.send("window-minimize");
        },
        maximize: () => {
            electron_1.ipcRenderer.send("window-maximize");
        },
        close: () => {
            electron_1.ipcRenderer.send("window-close");
        },
        quit: () => {
            electron_1.ipcRenderer.send("window-quit");
        },
        toggleOverlay: () => {
            electron_1.ipcRenderer.send("toggle-overlay");
        },
    },
    system: {
        openExternal: (url) => {
            electron_1.ipcRenderer.send("open-external", url);
        },
        openFolder: (path) => {
            electron_1.ipcRenderer.send("open-folder", path);
        },
        powerSaveStart: () => {
            electron_1.ipcRenderer.send("power-save-start");
        },
        powerSaveStop: () => {
            electron_1.ipcRenderer.send("power-save-stop");
        },
        pickExe: () => electron_1.ipcRenderer.invoke("pick-exe"),
        pickImage: () => electron_1.ipcRenderer.invoke("pick-image"),
        pickLog: () => electron_1.ipcRenderer.invoke("pick-log"),
        launchGame: (exePath) => electron_1.ipcRenderer.invoke("launch-game", exePath),
        scanGames: () => electron_1.ipcRenderer.invoke("scan-games"),
        getVersion: () => electron_1.ipcRenderer.invoke("app-get-version"),
        getPath: (name) => electron_1.ipcRenderer.invoke("app-get-path", name),
        sendOverlay: (data) => {
            electron_1.ipcRenderer.send("overlay-send", data);
        },
        getStats: () => electron_1.ipcRenderer.invoke("system-get-stats"),
    },
    session: {
        start: (payload) => electron_1.ipcRenderer.invoke("session-start", payload),
        get: () => electron_1.ipcRenderer.invoke("session-get"),
        end: (payload) => electron_1.ipcRenderer.invoke("session-end", payload),
    },
    logs: {
        hashFile: (logPath, gameId) => electron_1.ipcRenderer.invoke("hash-log-file", logPath, gameId),
        verifyHash: (logPath, expectedHash) => electron_1.ipcRenderer.invoke("verify-log-hash", logPath, expectedHash),
        readTail: (logPath, lines) => electron_1.ipcRenderer.invoke("read-log-tail", logPath, lines),
        startWatch: (logPath, gameId) => electron_1.ipcRenderer.invoke("start-log-watch", logPath, gameId),
        stopWatch: (logPath) => electron_1.ipcRenderer.invoke("stop-log-watch", logPath),
        getHashes: (gameId, limit) => electron_1.ipcRenderer.invoke("db-get-log-hashes", gameId, limit),
    },
    games: {
        getAll: () => electron_1.ipcRenderer.invoke("zaiken:games:get-all"),
        save: (game) => electron_1.ipcRenderer.invoke("zaiken:games:save", game),
        add: (game) => electron_1.ipcRenderer.invoke("zaiken:games:save", game),
        update: (id, patch) => electron_1.ipcRenderer.invoke("zaiken:games:update", id, patch),
        delete: (id) => electron_1.ipcRenderer.invoke("zaiken:games:delete", id),
    },
    stats: {
        getForGame: (gameId) => electron_1.ipcRenderer.invoke("db-get-stats", gameId),
        getDaily: (days) => electron_1.ipcRenderer.invoke("db-get-daily-stats", days),
    },
    profile: {
        get: () => electron_1.ipcRenderer.invoke("zaiken:profile:get"),
        save: (data) => electron_1.ipcRenderer.invoke("zaiken:profile:save", data),
    },
    achievements: {
        getAll: () => electron_1.ipcRenderer.invoke("db-get-achievements"),
        unlock: (id) => electron_1.ipcRenderer.invoke("db-unlock-achievement", id),
        updateProgress: (id, progress) => electron_1.ipcRenderer.invoke("db-update-achievement-progress", id, progress),
        evaluate: () => electron_1.ipcRenderer.invoke("db-evaluate-achievements"),
    },
    settings: {
        get: () => electron_1.ipcRenderer.invoke("db-get-settings"),
        save: (data) => electron_1.ipcRenderer.invoke("db-save-settings", data),
        resetAllData: () => electron_1.ipcRenderer.invoke("db-reset-all-data"),
    },
    ai: {
        status: () => electron_1.ipcRenderer.invoke("ai-status"),
        ask: (payload) => electron_1.ipcRenderer.invoke("ai-ask", payload),
        dailyReport: (gameName) => electron_1.ipcRenderer.invoke("ai-daily-report", gameName),
        dailyReportsBatch: (games) => electron_1.ipcRenderer.invoke("ai-daily-reports-batch", games),
        getReports: () => electron_1.ipcRenderer.invoke("db-get-ai-reports"),
        saveReport: (report) => electron_1.ipcRenderer.invoke("db-save-ai-report", report),
    },
    auth: {
        register: (email, password) => electron_1.ipcRenderer.invoke("auth-register", email, password),
        login: (email, password) => electron_1.ipcRenderer.invoke("auth-login", email, password),
        logout: () => electron_1.ipcRenderer.invoke("auth-logout"),
        getCurrentUser: () => electron_1.ipcRenderer.invoke("auth-current-user"),
    },
};
electron_1.contextBridge.exposeInMainWorld("zaiken", zaikenAPI);
console.log("ZAiken preload loaded");
