"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2 + Phase 3: settings channels. AI credentials are NEVER persisted in
// the SQLite settings table. Legacy aiApiKey / aiAppSecret keys are routed to
// the OS credential store (SecretStore) on save, migrated out of settings on
// read, and omitted from every response to the renderer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsIpcHandlers = registerSettingsIpcHandlers;
const electron_1 = require("electron");
const SqliteSettingsRepository_1 = require("../../infrastructure/database/repositories/SqliteSettingsRepository");
const aiCredentials_1 = require("../services/aiCredentials");
const windowRegistry_1 = require("../windowRegistry");
const settingsRepository = new SqliteSettingsRepository_1.SqliteSettingsRepository();
function sanitize(settings) {
    return aiCredentials_1.aiCredentials.sanitize(settings);
}
function registerSettingsIpcHandlers() {
    electron_1.ipcMain.handle("db-get-settings", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        try {
            await (0, aiCredentials_1.migrateAiSecretsInSettings)(settingsRepository);
        }
        catch {
            // migration failure must not break settings reads
        }
        try {
            return sanitize(settingsRepository.getAll());
        }
        catch {
            return sanitize(settingsRepository.getAll());
        }
    });
    electron_1.ipcMain.handle("db-save-settings", async (event, data) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return { success: false, error: "Settings must be an object." };
        }
        try {
            const payload = await aiCredentials_1.aiCredentials.routeSavePayload(data);
            const saved = settingsRepository.save(payload);
            return sanitize(saved);
        }
        catch (error) {
            return { success: false, error: error?.message || "Failed to save settings" };
        }
    });
    electron_1.ipcMain.handle("db-reset-all-data", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        settingsRepository.resetAllData();
        return { success: true };
    });
    electron_1.ipcMain.handle("app-get-version", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        try {
            return electron_1.app.getVersion();
        }
        catch {
            return null;
        }
    });
}
