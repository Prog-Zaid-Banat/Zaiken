"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsIpcHandlers = registerSettingsIpcHandlers;
const electron_1 = require("electron");
const SqliteSettingsRepository_1 = require("../../infrastructure/database/repositories/SqliteSettingsRepository");
const settingsRepository = new SqliteSettingsRepository_1.SqliteSettingsRepository();
function registerSettingsIpcHandlers() {
    electron_1.ipcMain.handle("db-get-settings", async () => {
        return settingsRepository.getAll();
    });
    electron_1.ipcMain.handle("db-save-settings", async (_, data) => {
        return settingsRepository.save(data);
    });
    electron_1.ipcMain.handle("db-reset-all-data", async () => {
        settingsRepository.resetAllData();
        return { success: true };
    });
    electron_1.ipcMain.handle("app-get-version", async () => {
        return electron_1.app.getVersion();
    });
}
