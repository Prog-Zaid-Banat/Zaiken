"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: main-process AI credential service. Wraps the OS-backed SecretStore
// (keytar) so AI credentials never touch SQLite settings, JSON config, or the
// renderer. No raw credential is ever returned by an IPC channel.
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiCredentials = exports.AiCredentialService = exports.LEGACY_SECRET_SETTING_KEYS = void 0;
exports.migrateAiSecretsInSettings = migrateAiSecretsInSettings;
const SecretStore_1 = require("../../infrastructure/secrets/SecretStore");
const API_KEY_SECRET = "ai.api_key";
const APP_SECRET_SECRET = "ai.app_secret";
/** Settings keys used by the legacy renderer form; they must never be persisted. */
exports.LEGACY_SECRET_SETTING_KEYS = ["aiApiKey", "aiAppSecret"];
function normalize(value) {
    if (typeof value !== "string")
        return null;
    const v = value.trim();
    return v ? v : null;
}
class AiCredentialService {
    store() {
        return (0, SecretStore_1.getSecretStore)();
    }
    async getApiKey() {
        return this.store().get(API_KEY_SECRET);
    }
    async setApiKey(value) {
        const v = normalize(value);
        await this.store().set(API_KEY_SECRET, v || "");
    }
    async getAppSecret() {
        return this.store().get(APP_SECRET_SECRET);
    }
    async setAppSecret(value) {
        const v = normalize(value);
        await this.store().set(APP_SECRET_SECRET, v || "");
    }
    async hasCredentials() {
        const [apiKey, appSecret] = await Promise.all([this.getApiKey(), this.getAppSecret()]);
        return !!(apiKey || appSecret);
    }
    /**
     * One-shot migration: if a legacy plaintext credential sits in the SQLite
     * settings table (written by the pre-Phase-3 settings IPC path), move it into
     * the OS credential store and delete it from settings. Never silently drops
     * the user's credential without moving it first.
     */
    async migrateFromSettings(settings, deleteKeys) {
        const apiKey = normalize(settings.aiApiKey);
        const appSecret = normalize(settings.aiAppSecret);
        let migratedApiKey = false;
        let migratedAppSecret = false;
        if (apiKey) {
            await this.setApiKey(apiKey);
            migratedApiKey = true;
        }
        if (appSecret) {
            await this.setAppSecret(appSecret);
            migratedAppSecret = true;
        }
        if (migratedApiKey || migratedAppSecret) {
            deleteKeys([...exports.LEGACY_SECRET_SETTING_KEYS]);
        }
        return { migratedApiKey, migratedAppSecret };
    }
    /** Removes legacy secret keys from a settings object (for IPC responses). */
    sanitize(settings) {
        const copy = { ...settings };
        for (const key of exports.LEGACY_SECRET_SETTING_KEYS) {
            delete copy[key];
        }
        return copy;
    }
    /** Extracts and stores the legacy secret keys from an incoming save payload. */
    async routeSavePayload(data) {
        const remaining = { ...data };
        if (typeof remaining.aiApiKey === "string") {
            await this.setApiKey(remaining.aiApiKey);
            delete remaining.aiApiKey;
        }
        if (typeof remaining.aiAppSecret === "string") {
            await this.setAppSecret(remaining.aiAppSecret);
            delete remaining.aiAppSecret;
        }
        return remaining;
    }
}
exports.AiCredentialService = AiCredentialService;
/**
 * Reads/writes AI credentials through the settings table on behalf of the
 * legacy settings IPC path (only inside the main process).
 */
async function migrateAiSecretsInSettings(repository) {
    const service = new AiCredentialService();
    const all = repository.getAll();
    if (!all || typeof all !== "object") {
        return { migratedApiKey: false, migratedAppSecret: false };
    }
    return service.migrateFromSettings(all, (keys) => repository.deleteKeys(keys));
}
exports.aiCredentials = new AiCredentialService();
