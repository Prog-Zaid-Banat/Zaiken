// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: main-process AI credential service. Wraps the OS-backed SecretStore
// (keytar) so AI credentials never touch SQLite settings, JSON config, or the
// renderer. No raw credential is ever returned by an IPC channel.

import { getSecretStore, SecretStore } from "../../infrastructure/secrets/SecretStore";
import { SqliteSettingsRepository } from "../../infrastructure/database/repositories/SqliteSettingsRepository";

const API_KEY_SECRET = "ai.api_key";
const APP_SECRET_SECRET = "ai.app_secret";

/** Settings keys used by the legacy renderer form; they must never be persisted. */
export const LEGACY_SECRET_SETTING_KEYS = ["aiApiKey", "aiAppSecret"] as const;

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

export class AiCredentialService {
  private store(): SecretStore {
    return getSecretStore();
  }

  async getApiKey(): Promise<string | null> {
    return this.store().get(API_KEY_SECRET);
  }

  async setApiKey(value: string | null | undefined): Promise<void> {
    const v = normalize(value);
    await this.store().set(API_KEY_SECRET, v || "");
  }

  async getAppSecret(): Promise<string | null> {
    return this.store().get(APP_SECRET_SECRET);
  }

  async setAppSecret(value: string | null | undefined): Promise<void> {
    const v = normalize(value);
    await this.store().set(APP_SECRET_SECRET, v || "");
  }

  async hasCredentials(): Promise<boolean> {
    const [apiKey, appSecret] = await Promise.all([this.getApiKey(), this.getAppSecret()]);
    return !!(apiKey || appSecret);
  }

  /**
   * One-shot migration: if a legacy plaintext credential sits in the SQLite
   * settings table (written by the pre-Phase-3 settings IPC path), move it into
   * the OS credential store and delete it from settings. Never silently drops
   * the user's credential without moving it first.
   */
  async migrateFromSettings(
    settings: Record<string, unknown>,
    deleteKeys: (keys: string[]) => void
  ): Promise<{ migratedApiKey: boolean; migratedAppSecret: boolean }> {
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
      deleteKeys([...LEGACY_SECRET_SETTING_KEYS]);
    }

    return { migratedApiKey, migratedAppSecret };
  }

  /** Removes legacy secret keys from a settings object (for IPC responses). */
  sanitize<T extends Record<string, unknown>>(settings: T): Omit<T, (typeof LEGACY_SECRET_SETTING_KEYS)[number]> {
    const copy = { ...settings };
    for (const key of LEGACY_SECRET_SETTING_KEYS) {
      delete copy[key];
    }
    return copy;
  }

  /** Extracts and stores the legacy secret keys from an incoming save payload. */
  async routeSavePayload(data: Record<string, unknown>): Promise<Record<string, unknown>> {
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

/**
 * Reads/writes AI credentials through the settings table on behalf of the
 * legacy settings IPC path (only inside the main process).
 */
export async function migrateAiSecretsInSettings(repository: SqliteSettingsRepository): Promise<{
  migratedApiKey: boolean;
  migratedAppSecret: boolean;
}> {
  const service = new AiCredentialService();
  const all = repository.getAll();
  if (!all || typeof all !== "object") {
    return { migratedApiKey: false, migratedAppSecret: false };
  }
  return service.migrateFromSettings(all as Record<string, unknown>, (keys) => repository.deleteKeys(keys));
}

export const aiCredentials = new AiCredentialService();
