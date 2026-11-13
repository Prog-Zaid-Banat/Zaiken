"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: window controls (send-style) + overlay toggle.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowIpcHandlers = registerWindowIpcHandlers;
const electron_1 = require("electron");
const windowRegistry_1 = require("../windowRegistry");
const SqliteSettingsRepository_1 = require("../../infrastructure/database/repositories/SqliteSettingsRepository");
function registerWindowIpcHandlers() {
    electron_1.ipcMain.on("window-minimize", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        (0, windowRegistry_1.getMainWindow)()?.minimize();
    });
    electron_1.ipcMain.on("window-maximize", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        const win = (0, windowRegistry_1.getMainWindow)();
        if (!win)
            return;
        if (win.isMaximized())
            win.unmaximize();
        else
            win.maximize();
    });
    electron_1.ipcMain.on("window-close", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        const win = (0, windowRegistry_1.getMainWindow)();
        if (!win)
            return;
        let minimizeToTray = false;
        try {
            const settings = new SqliteSettingsRepository_1.SqliteSettingsRepository().getAll();
            minimizeToTray = settings.minimizeToTray === true;
        }
        catch {
            minimizeToTray = false;
        }
        if (minimizeToTray)
            win.hide();
        else
            win.close();
    });
    electron_1.ipcMain.on("window-quit", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        electron_1.app.quit();
    });
    electron_1.ipcMain.on("toggle-overlay", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return;
        (0, windowRegistry_1.toggleOverlay)();
    });
}
