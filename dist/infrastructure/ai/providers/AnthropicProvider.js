"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
class AnthropicProvider {
    apiKey;
    opts;
    name = 'anthropic';
    constructor(apiKey, opts) {
        this.apiKey = apiKey;
        this.opts = opts;
    }
    async chat(req) {
        const model = this.opts?.defaultModel || 'claude-sonnet-4-20250514';
        const body = JSON.stringify({
            model,
            max_tokens: 2048,
            temperature: req.temperature ?? 0.7,
            system: req.system || undefined,
            messages: [{ role: 'user', content: req.user }],
        });
        try {
            const data = await this.post('https://api.anthropic.com/v1/messages', body);
            const text = (data.content || []).map((c) => c.text || '').join('\n').trim();
            if (!text)
                return { ok: false, error: 'Empty response from Anthropic', provider: this.name };
            return { ok: true, text, model, provider: this.name };
        }
        catch (e) {
            return { ok: false, error: e?.message || String(e), provider: this.name };
        }
    }
    post(urlStr, body) {
        return new Promise((resolve, reject) => {
            const u = new url_1.URL(urlStr);
            const req = https_1.default.request({
                hostname: u.hostname,
                path: u.pathname,
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-length': Buffer.byteLength(body),
                },
            }, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const text = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && res.statusCode >= 400) {
                        return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 400)}`));
                    }
                    try {
                        resolve(JSON.parse(text));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
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
exports.AnthropicProvider = AnthropicProvider;
