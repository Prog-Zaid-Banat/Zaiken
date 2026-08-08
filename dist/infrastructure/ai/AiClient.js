"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiClient = void 0;
/**
 * Multi-provider AI client with retry, timeout, fallback
 * Copyright © 2026 Zaid Bilal Banat
 */
const SecretStore_1 = require("../secrets/SecretStore");
const Logger_1 = require("../logging/Logger");
const OpenAICompatibleProvider_1 = require("./providers/OpenAICompatibleProvider");
const AnthropicProvider_1 = require("./providers/AnthropicProvider");
const log = (0, Logger_1.createLogger)('ai');
class AiClient {
    rate = { lastAt: 0, hourStart: Date.now(), count: 0, maxPerHour: 40, minIntervalMs: 2500 };
    async chat(cfg, req) {
        this.assertRate();
        const apiKey = (await (0, SecretStore_1.getSecretStore)().get('ai.api_key')) || '';
        if (!apiKey) {
            return { ok: false, error: 'AI API key not configured in secure storage', needsSetup: true };
        }
        const providers = this.buildProviderChain(cfg, apiKey);
        let lastError = 'All providers failed';
        for (const provider of providers) {
            const result = await this.withRetry(() => provider.chat(req), cfg.maxRetries ?? 2, cfg.timeoutMs ?? 45000);
            if (result.ok) {
                this.rate.lastAt = Date.now();
                this.rate.count += 1;
                return result;
            }
            lastError = result.error || lastError;
            log.warn({ provider: provider.name, error: lastError }, 'provider failed — trying fallback');
        }
        return { ok: false, error: lastError };
    }
    buildProviderChain(cfg, apiKey) {
        const primary = this.makeProvider(cfg, apiKey);
        const chain = [primary];
        // simple fallback order if primary is not groq
        if (cfg.provider !== 'groq') {
            chain.push(new OpenAICompatibleProvider_1.OpenAICompatibleProvider('groq', apiKey, {
                baseUrl: 'https://api.groq.com/openai/v1',
                defaultModel: 'llama-3.3-70b-versatile',
            }));
        }
        return chain;
    }
    makeProvider(cfg, apiKey) {
        if (cfg.provider === 'anthropic') {
            return new AnthropicProvider_1.AnthropicProvider(apiKey, { defaultModel: cfg.model });
        }
        const defaults = {
            openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
            openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini' },
            groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
            custom: { baseUrl: cfg.baseUrl || 'https://api.openai.com/v1', defaultModel: cfg.model || 'gpt-4o-mini' },
        };
        const d = defaults[cfg.provider] || defaults.openai;
        return new OpenAICompatibleProvider_1.OpenAICompatibleProvider(cfg.provider, apiKey, {
            baseUrl: cfg.baseUrl || d.baseUrl,
            defaultModel: cfg.model || d.defaultModel,
        });
    }
    assertRate() {
        const now = Date.now();
        if (now - this.rate.hourStart > 3600000) {
            this.rate.hourStart = now;
            this.rate.count = 0;
        }
        if (this.rate.count >= this.rate.maxPerHour) {
            throw new Error('Hourly AI limit reached');
        }
        if (now - this.rate.lastAt < this.rate.minIntervalMs) {
            throw new Error('Please wait a moment between coach requests');
        }
    }
    async withRetry(fn, retries, _timeoutMs) {
        let attempt = 0;
        let last = { ok: false, error: 'unknown' };
        while (attempt <= retries) {
            try {
                last = await fn();
                if (last.ok)
                    return last;
            }
            catch (e) {
                last = { ok: false, error: e?.message || String(e) };
            }
            attempt += 1;
            if (attempt <= retries) {
                await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
            }
        }
        return last;
    }
}
exports.AiClient = AiClient;
