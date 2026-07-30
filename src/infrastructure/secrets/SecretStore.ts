/**
 * Secure secret storage — Keychain / Credential Manager / Secret Service
 * Copyright © 2026 Zaid Bilal Banat
 *
 * NEVER store API keys in JSON or SQLite settings.
 */
import { createLogger } from '../logging/Logger';

const log = createLogger('security');
const SERVICE = 'Zaiken';

export type SecretKey =
  | 'ai.api_key'
  | 'ai.app_secret'
  | 'db.encryption_key'
  | string;

export class SecretStore {
  private keytar: typeof import('keytar') | null = null;
  private backend: 'keytar' | 'memory-dev' = 'memory-dev';
  private memory = new Map<string, string>();

  async init(): Promise<void> {
    try {
      // dynamic import so pure-node tests can still load module graph
      this.keytar = require('keytar');
      this.backend = 'keytar';
      log.info({ backend: this.backend }, 'SecretStore ready');
    } catch (e: any) {
      this.backend = 'memory-dev';
      log.warn(
        { err: e?.message },
        'keytar unavailable — using in-memory secrets (DEV ONLY, never ship like this)'
      );
    }
  }

  async set(key: SecretKey, value: string): Promise<void> {
    if (!value) {
      await this.delete(key);
      return;
    }
    if (this.backend === 'keytar' && this.keytar) {
      await this.keytar.setPassword(SERVICE, key, value);
      return;
    }
    this.memory.set(key, value);
  }

  async get(key: SecretKey): Promise<string | null> {
    if (this.backend === 'keytar' && this.keytar) {
      return this.keytar.getPassword(SERVICE, key);
    }
    return this.memory.get(key) ?? null;
  }

  async delete(key: SecretKey): Promise<void> {
    if (this.backend === 'keytar' && this.keytar) {
      try {
        await this.keytar.deletePassword(SERVICE, key);
      } catch {
        /* ignore missing */
      }
      return;
    }
    this.memory.delete(key);
  }

  async has(key: SecretKey): Promise<boolean> {
    const v = await this.get(key);
    return Boolean(v && v.length > 0);
  }

  getBackend(): string {
    return this.backend;
  }
}

let singleton: SecretStore | null = null;

export function getSecretStore(): SecretStore {
  if (!singleton) singleton = new SecretStore();
  return singleton;
}
