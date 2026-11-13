// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2 + Phase 3: settings channels. AI credentials are NEVER persisted in
// the SQLite settings table. Legacy aiApiKey / aiAppSecret keys are routed to
// the OS credential store (SecretStore) on save, migrated out of settings on
// read, and omitted from every response to the renderer.

import { app, ipcMain } from "electron";
import { SqliteSettingsRepository } from "../../infrastructure/database/repositories/SqliteSettingsRepository";
import {
  aiCredentials,
  migrateAiSecretsInSettings,
} from "../services/aiCredentials";
import { isTrustedSender } from "../windowRegistry";

const settingsRepository = new SqliteSettingsRepository();

function sanitize(settings: Record<string, unknown>): Record<string, unknown> {
  return aiCredentials.sanitize(settings);
}

export function registerSettingsIpcHandlers() {
  ipcMain.handle("db-get-settings", async (event) => {
    if (!isTrustedSender(event)) return null;
    try {
      await migrateAiSecretsInSettings(settingsRepository);
    } catch {
      // migration failure must not break settings reads
    }
    try {
      return sanitize(settingsRepository.getAll());
    } catch {
      return sanitize(settingsRepository.getAll());
    }
  });

  ipcMain.handle("db-save-settings", async (event, data) => {
    if (!isTrustedSender(event)) return null;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { success: false, error: "Settings must be an object." };
    }
    try {
      const payload = await aiCredentials.routeSavePayload(data as Record<string, unknown>);
      const saved = settingsRepository.save(payload);
      return sanitize(saved);
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to save settings" };
    }
  });

  ipcMain.handle("db-reset-all-data", async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    settingsRepository.resetAllData();
    return { success: true };
  });

  ipcMain.handle("app-get-version", (event) => {
    if (!isTrustedSender(event)) return null;
    try {
      return app.getVersion();
    } catch {
      return null;
    }
  });
}
