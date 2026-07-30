/**
 * Multi-provider AI client with retry, timeout, fallback
 * Copyright © 2026 Zaid Bilal Banat
 */
import { getSecretStore } from '../secrets/SecretStore';
import { createLogger } from '../logging/Logger';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import type { AiProvider, AiChatRequest, AiChatResult } from './providers/types';

const log = createLogger('ai');

export interface AiRuntimeConfig {
  provider: 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'custom';
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class AiClient {
  private rate = { lastAt: 0, hourStart: Date.now(), count: 0, maxPerHour: 40, minIntervalMs: 2500 };

  async chat(cfg: AiRuntimeConfig, req: AiChatRequest): Promise<AiChatResult> {
    this.assertRate();
    const apiKey = (await getSecretStore().get('ai.api_key')) || '';
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

  private buildProviderChain(cfg: AiRuntimeConfig, apiKey: string): AiProvider[] {
    const primary = this.makeProvider(cfg, apiKey);
    const chain: AiProvider[] = [primary];

    // simple fallback order if primary is not groq
    if (cfg.provider !== 'groq') {
      chain.push(
        new OpenAICompatibleProvider('groq', apiKey, {
          baseUrl: 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.3-70b-versatile',
        })
      );
    }
    return chain;
  }

  private makeProvider(cfg: AiRuntimeConfig, apiKey: string): AiProvider {
    if (cfg.provider === 'anthropic') {
      return new AnthropicProvider(apiKey, { defaultModel: cfg.model });
    }
    const defaults: Record<string, { baseUrl: string; defaultModel: string }> = {
      openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
      openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini' },
      groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
      custom: { baseUrl: cfg.baseUrl || 'https://api.openai.com/v1', defaultModel: cfg.model || 'gpt-4o-mini' },
    };
    const d = defaults[cfg.provider] || defaults.openai;
    return new OpenAICompatibleProvider(cfg.provider, apiKey, {
      baseUrl: cfg.baseUrl || d.baseUrl,
      defaultModel: cfg.model || d.defaultModel,
    });
  }

  private assertRate(): void {
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

  private async withRetry(
    fn: () => Promise<AiChatResult>,
    retries: number,
    _timeoutMs: number
  ): Promise<AiChatResult> {
    let attempt = 0;
    let last: AiChatResult = { ok: false, error: 'unknown' };
    while (attempt <= retries) {
      try {
        last = await fn();
        if (last.ok) return last;
      } catch (e: any) {
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
