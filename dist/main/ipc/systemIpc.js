"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: system-level IPC. launch-game only launches executables that exist
// in Zaiken's registered game library (allowlist). Renderer-supplied paths
// are never trusted by themselves.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemIpcHandlers = registerSystemIpcHandlers;
const electron_1 = require("electron");
const repositoryProvider_1 = require("./repositoryProvider");
const SystemStatsService_1 = require("../services/SystemStatsService");
const validationSchemas_1 = require("./validationSchemas");
const windowRegistry_1 = require("../windowRegistry");
let powerBlockerId = null;
const ALLOWED_PATH_NAMES = new Set([
    "userData",
    "appData",
    "home",
    "temp",
    "cache",
    "logs",
    "documents",
    "downloads",
    "music",
    "pictures",
    "videos",
    "desktop",
]);
function registerSystemIpcHandlers() {
    electron_1.ipcMain.handle("pick-exe", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Executable", extensions: ["exe"] },
                { name: "All Files", extensions: ["*"] },
            ],
        });
        return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
    });
    electron_1.ipcMain.handle("pick-image", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
            ],
        });
        return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
    });
    electron_1.ipcMain.handle("pick-log", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Log files", extensions: ["log", "txt", "csv", "json"] },
                { name: "All Files", extensions: ["*"] },
            ],
        });
        return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
    });
    // Security: the renderer may only launch an executable that is registered
    // in the game library. Existence on disk is handled by the OS open call —
    // it is not the security boundary.
    electron_1.ipcMain.handle("launch-game", async (event, exePath) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        if (typeof exePath !== "string" || !exePath.trim()) {
            return { ok: false, error: "No executable path provided" };
        }
        try {
            const games = await (0, repositoryProvider_1.getGameRepository)().findAll();
            if (!(0, validationSchemas_1.isRegisteredExePath)(exePath, games)) {
                return { ok: false, error: "Refused: executable is not in the registered game library" };
            }
            const error = await electron_1.shell.openPath(exePath);
            if (error)
                return { ok: false, error };
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err?.message || "Failed to launch game" };
        }
    });
    // Not implemented yet — returns an empty list so the UI handles
    // "no games found" gracefully. (Legacy scanner was JSON-store bound.)
    electron_1.ipcMain.handle("scan-games", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        return [];
    });
    electron_1.ipcMain.on("open-external", (event, url) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        if ((0, validationSchemas_1.isSafeHttpUrl)(url)) {
            electron_1.shell.openExternal(url);
        }
    });
    electron_1.ipcMain.on("open-folder", async (event, folder) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        if (typeof folder !== "string" || !folder.trim())
            return;
        try {
            const games = await (0, repositoryProvider_1.getGameRepository)().findAll();
            if (!(0, validationSchemas_1.isRegisteredFolder)(folder, games))
                return;
            electron_1.shell.openPath(folder);
        }
        catch {
            // ignore open failures
        }
    });
    electron_1.ipcMain.on("power-save-start", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        if (powerBlockerId === null) {
            powerBlockerId = electron_1.powerSaveBlocker.start("prevent-display-sleep");
        }
    });
    electron_1.ipcMain.on("power-save-stop", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        if (powerBlockerId !== null) {
            try {
                electron_1.powerSaveBlocker.stop(powerBlockerId);
            }
            catch {
                // ignore
            }
            powerBlockerId = null;
        }
    });
    electron_1.ipcMain.on("overlay-send", (event, data) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        (0, windowRegistry_1.sendToOverlay)("overlay-update", data);
    });
    electron_1.ipcMain.handle("app-get-path", (event, name) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        if (typeof name !== "string" || !ALLOWED_PATH_NAMES.has(name))
            return null;
        try {
            return electron_1.app.getPath(name);
        }
        catch {
            return null;
        }
    });
    electron_1.ipcMain.handle("system-get-stats", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        try {
            return await SystemStatsService_1.SystemStatsService.collectSnapshot();
        }
        catch {
            return null;
        }
    });
}
