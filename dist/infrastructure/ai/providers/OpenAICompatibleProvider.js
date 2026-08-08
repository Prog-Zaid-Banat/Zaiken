"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
class OpenAICompatibleProvider {
    name;
    apiKey;
    opts;
    constructor(name, apiKey, opts) {
        this.name = name;
        this.apiKey = apiKey;
        this.opts = opts;
    }
    async chat(req) {
        const model = this.opts.defaultModel;
        const body = JSON.stringify({
            model,
            temperature: req.temperature ?? 0.7,
            messages: [
                ...(req.system ? [{ role: 'system', content: req.system }] : []),
                { role: 'user', content: req.user },
            ],
        });
        const headers = {
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
            if (!text)
                return { ok: false, error: data?.error?.message || 'Empty response', provider: this.name };
            return { ok: true, text: String(text).trim(), model, provider: this.name };
        }
        catch (e) {
            return { ok: false, error: e?.message || String(e), provider: this.name };
        }
    }
    postJson(urlStr, headers, body) {
        return new Promise((resolve, reject) => {
            const u = new url_1.URL(urlStr);
            const lib = u.protocol === 'http:' ? http_1.default : https_1.default;
            const req = lib.request({
                hostname: u.hostname,
                port: u.port || (u.protocol === 'http:' ? 80 : 443),
                path: u.pathname + u.search,
                method: 'POST',
                headers: { ...headers, 'content-length': Buffer.byteLength(body) },
            }, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const text = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && res.statusCode >= 400) {
                        return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 400)}`));
                    }
                    try {
                        resolve(text ? JSON.parse(text) : {});
                    }
                    catch {
                        resolve({ raw: text });
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
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
