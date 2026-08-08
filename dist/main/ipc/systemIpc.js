"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemIpcHandlers = registerSystemIpcHandlers;
const electron_1 = require("electron");
function registerSystemIpcHandlers() {
    electron_1.ipcMain.handle("pick-exe", async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Executable", extensions: ["exe"] }
            ]
        });
        if (result.canceled || !result.filePaths.length) {
            return null;
        }
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle("pick-image", async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                {
                    name: "Images",
                    extensions: ["png", "jpg", "jpeg", "webp", "gif"]
                }
            ]
        });
        if (result.canceled || !result.filePaths.length) {
            return null;
        }
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle("pick-log", async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Log files", extensions: ["log", "txt"] }
            ]
        });
        if (result.canceled || !result.filePaths.length) {
            return null;
        }
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle("launch-game", async (_, exePath) => {
        if (!exePath) {
            return { success: false, error: "No executable path provided" };
        }
        try {
            const error = await electron_1.shell.openPath(exePath);
            if (error) {
                return { success: false, error };
            }
            return { success: true };
        }
        catch (err) {
            return {
                success: false,
                error: err?.message || "Failed to launch game"
            };
        }
    });
    // Auto-scan for installed games (Steam/Epic/GOG libraries).
    // Not implemented yet — returns an empty list so the UI can
    // handle "no games found" gracefully instead of throwing.
    electron_1.ipcMain.handle("scan-games", async () => {
        return [];
    });
}
