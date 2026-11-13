"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretStore = void 0;
exports.getSecretStore = getSecretStore;
/**
 * Secure secret storage — Keychain / Credential Manager / Secret Service
 * Copyright © 2026 Zaid Bilal Banat
 *
 * NEVER store API keys in JSON or SQLite settings.
 */
const Logger_1 = require("../logging/Logger");
const log = (0, Logger_1.createLogger)('security');
const SERVICE = 'Zaiken';
class SecretStore {
    keytar = null;
    backend = 'memory-dev';
    memory = new Map();
    initPromise = null;
    /** Initializes the OS credential backend exactly once (idempotent). */
    init() {
        if (!this.initPromise)
            this.initPromise = this.doInit();
        return this.initPromise;
    }
    async doInit() {
        try {
            // dynamic import so pure-node tests can still load module graph
            this.keytar = require('keytar');
            this.backend = 'keytar';
            log.info({ backend: this.backend }, 'SecretStore ready');
        }
        catch (e) {
            this.backend = 'memory-dev';
            log.warn({ err: e?.message }, 'keytar unavailable — using in-memory secrets (DEV ONLY, never ship like this)');
        }
    }
    async set(key, value) {
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
    async get(key) {
        if (this.backend === 'keytar' && this.keytar) {
            return this.keytar.getPassword(SERVICE, key);
        }
        return this.memory.get(key) ?? null;
    }
    async delete(key) {
        if (this.backend === 'keytar' && this.keytar) {
            try {
                await this.keytar.deletePassword(SERVICE, key);
            }
            catch {
                /* ignore missing */
            }
            return;
        }
        this.memory.delete(key);
    }
    async has(key) {
        const v = await this.get(key);
        return Boolean(v && v.length > 0);
    }
    getBackend() {
        return this.backend;
    }
}
exports.SecretStore = SecretStore;
let singleton = null;
function getSecretStore() {
    if (!singleton)
        singleton = new SecretStore();
    return singleton;
}
