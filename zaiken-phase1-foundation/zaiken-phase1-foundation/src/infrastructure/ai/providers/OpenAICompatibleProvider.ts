import https from 'https';
import http from 'http';
import { URL } from 'url';
import type { AiProvider, AiChatRequest, AiChatResult } from './types';

export class OpenAICompatibleProvider implements AiProvider {
  constructor(
    public name: string,
    private apiKey: string,
    private opts: { baseUrl: string; defaultModel: string }
  ) {}

  async chat(req: AiChatRequest): Promise<AiChatResult> {
    const model = this.opts.defaultModel;
    const body = JSON.stringify({
      model,
      temperature: req.temperature ?? 0.7,
      messages: [
        ...(req.system ? [{ role: 'system', content: req.system }] : []),
        { role: 'user', content: req.user },
      ],
    });

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
    };
    if (this.name === 'openrouter') {
      headers['HTTP-Referer'] = 'https://zaiken.app';
      headers['X-Title'] = 'Zaiken Coach';
    }

    try {
      const data = await this.postJson(this.opts.baseUrl.replace(/\/$/, '') + '/chat/completions', headers, body);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) return { ok: false, error: data?.error?.message || 'Empty response', provider: this.name };
      return { ok: true, text: String(text).trim(), model, provider: this.name };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e), provider: this.name };
    }
  }

  private postJson(urlStr: string, headers: Record<string, string>, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const u = new URL(urlStr);
      const lib = u.protocol === 'http:' ? http : https;
      const req = lib.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'http:' ? 80 : 443),
          path: u.pathname + u.search,
          method: 'POST',
          headers: { ...headers, 'content-length': Buffer.byteLength(body) },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 400)}`));
            }
            try {
              resolve(text ? JSON.parse(text) : {});
            } catch {
              resolve({ raw: text });
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(45000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.write(body);
      req.end();
    });
  }
}
