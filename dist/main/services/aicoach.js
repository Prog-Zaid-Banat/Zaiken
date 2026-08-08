// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';
/**
 * Cloud AI Coach — real LLM calls + optional live web research.
 * No canned local "coach" replies when a key is configured.
 * Without a key, returns a clear setup error (never pretends to be an LLM).
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const RATE = {
    minIntervalMs: 2500,
    maxPerHour: 40
};
let lastCallAt = 0;
let callsThisHour = 0;
let hourWindowStart = Date.now();
const ESPORT_DEFAULTS = [
    'Valorant', 'Counter-Strike 2', 'League of Legends', 'Dota 2',
    'Fortnite', 'Rocket League', 'Apex Legends', 'Overwatch 2',
    'Call of Duty', 'Rainbow Six Siege', 'Mobile Legends', 'PUBG'
];
function _loadFileConfig() {
    // Developer-supplied key for distributed builds. Prefer this over per-user Settings.
    // Paths checked (first hit wins):
    //   1) ZAIKEN_AI_CONFIG env path
    //   2) <project>/ai.config.json
    //   3) <userData>/ai.config.json
    const fs = require('fs');
    const path = require('path');
    const candidates = [];
    if (process.env.ZAIKEN_AI_CONFIG)
        candidates.push(process.env.ZAIKEN_AI_CONFIG);
    candidates.push(path.join(__dirname, '..', '..', '..', 'ai.config.json')); // project root when running from source
    candidates.push(path.join(__dirname, '..', 'ai.config.json'));
    try {
        const { app } = require('electron');
        if (app && app.getPath)
            candidates.push(path.join(app.getPath('userData'), 'ai.config.json'));
    }
    catch { /* not in electron yet */ }
    for (const fp of candidates) {
        try {
            if (fp && fs.existsSync(fp)) {
                const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
                if (raw && (raw.apiKey || raw.AI_API_KEY || raw.proxyUrl))
                    return raw;
            }
        }
        catch (e) {
            console.warn('[aicoach] bad config file', fp, e.message);
        }
    }
    return {};
}
function _settings(db) {
    const s = db.getSettings() || {};
    const fileCfg = _loadFileConfig();
    // Priority: environment > ai.config.json > Settings UI (optional override)
    const apiKey = (process.env.ZAIKEN_AI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENAI_API_KEY ||
        fileCfg.apiKey ||
        fileCfg.AI_API_KEY ||
        s.aiApiKey ||
        '').toString().trim();
    const provider = (process.env.ZAIKEN_AI_PROVIDER ||
        fileCfg.provider ||
        s.aiProvider ||
        'groq').toString().toLowerCase();
    const model = (process.env.ZAIKEN_AI_MODEL ||
        fileCfg.model ||
        s.aiModel ||
        '').toString().trim();
    const baseUrl = (process.env.ZAIKEN_AI_BASE_URL ||
        fileCfg.baseUrl ||
        s.aiBaseUrl ||
        '').toString().trim();
    const webSearch = fileCfg.webSearch !== undefined
        ? Boolean(fileCfg.webSearch)
        : (s.aiWebSearch !== false);
    const proxyUrl = (process.env.ZAIKEN_AI_PROXY_URL ||
        fileCfg.proxyUrl ||
        s.aiProxyUrl ||
        '').toString().trim().replace(/\/$/, '');
    const appSecret = (process.env.ZAIKEN_APP_SECRET ||
        fileCfg.appSecret ||
        s.aiAppSecret ||
        '').toString().trim();
    return {
        provider,
        apiKey,
        model,
        baseUrl,
        webSearch,
        proxyUrl,
        appSecret,
        dailyGames: Array.isArray(s.aiDailyGames) && s.aiDailyGames.length
            ? s.aiDailyGames
            : (Array.isArray(fileCfg.dailyGames) ? fileCfg.dailyGames : ESPORT_DEFAULTS.slice(0, 6))
    };
}
function _rateCheck() {
    const now = Date.now();
    if (now - hourWindowStart > 3600000) {
        hourWindowStart = now;
        callsThisHour = 0;
    }
    if (callsThisHour >= RATE.maxPerHour) {
        return { ok: false, error: 'Hourly AI limit reached. Try again later.' };
    }
    if (now - lastCallAt < RATE.minIntervalMs) {
        return { ok: false, error: 'Please wait a moment between coach requests.' };
    }
    return { ok: true };
}
function _httpJson(urlStr, { method = 'GET', headers = {}, body = null, timeoutMs = 45000 } = {}) {
    return new Promise((resolve, reject) => {
        let u;
        try {
            u = new URL(urlStr);
        }
        catch (e) {
            return reject(e);
        }
        const lib = u.protocol === 'http:' ? http : https;
        const req = lib.request({
            hostname: u.hostname,
            port: u.port || (u.protocol === 'http:' ? 80 : 443),
            path: u.pathname + u.search,
            method,
            headers
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode >= 400) {
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
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
        if (body)
            req.write(body);
        req.end();
    });
}
/** Lightweight public search (no key). Best-effort; may be rate-limited. */
async function webResearch(query) {
    const q = String(query || '').trim().slice(0, 200);
    if (!q)
        return [];
    const results = [];
    // DuckDuckGo Instant Answer API
    try {
        const data = await _httpJson('https://api.duckduckgo.com/?q=' + encodeURIComponent(q) + '&format=json&no_html=1&skip_disambig=1', { timeoutMs: 12000 });
        if (data.AbstractText) {
            results.push({
                title: data.Heading || 'Summary',
                snippet: data.AbstractText,
                url: data.AbstractURL || ''
            });
        }
        const related = data.RelatedTopics || [];
        for (const item of related.slice(0, 5)) {
            if (item.Text) {
                results.push({
                    title: (item.Text || '').slice(0, 80),
                    snippet: item.Text,
                    url: item.FirstURL || ''
                });
            }
            else if (item.Topics) {
                for (const t of item.Topics.slice(0, 2)) {
                    if (t.Text)
                        results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL || '' });
                }
            }
        }
    }
    catch (e) {
        console.warn('[aicoach] DDG search failed:', e.message);
    }
    // Wikipedia opensearch as secondary signal
    try {
        const wiki = await _httpJson('https://en.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&search=' +
            encodeURIComponent(q), { timeoutMs: 10000 });
        if (Array.isArray(wiki) && wiki[1] && wiki[3]) {
            for (let i = 0; i < wiki[1].length; i++) {
                results.push({
                    title: wiki[1][i],
                    snippet: 'Wikipedia: ' + wiki[1][i],
                    url: wiki[3][i]
                });
            }
        }
    }
    catch (e) {
        console.warn('[aicoach] wiki search failed:', e.message);
    }
    // de-dupe by snippet prefix
    const seen = new Set();
    return results.filter((r) => {
        const k = (r.snippet || '').slice(0, 60);
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    }).slice(0, 8);
}
function _defaultModel(provider) {
    if (provider === 'anthropic')
        return 'claude-sonnet-4-20250514';
    if (provider === 'openrouter')
        return 'openai/gpt-4o-mini';
    if (provider === 'groq')
        return 'llama-3.3-70b-versatile';
    return 'gpt-4o-mini';
}
function _endpoint(cfg) {
    if (cfg.baseUrl)
        return cfg.baseUrl.replace(/\/$/, '');
    if (cfg.provider === 'anthropic')
        return 'https://api.anthropic.com/v1';
    if (cfg.provider === 'openrouter')
        return 'https://openrouter.ai/api/v1';
    if (cfg.provider === 'groq')
        return 'https://api.groq.com/openai/v1';
    return 'https://api.openai.com/v1';
}
async function callLLM(cfg, { system, user, temperature = 0.7 }) {
    const model = cfg.model || _defaultModel(cfg.provider);
    const base = _endpoint(cfg);
    if (cfg.provider === 'anthropic') {
        const body = JSON.stringify({
            model,
            max_tokens: 2048,
            temperature,
            system,
            messages: [{ role: 'user', content: user }]
        });
        const data = await _httpJson(base + '/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': cfg.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body
        });
        const text = (data.content || []).map((c) => c.text || '').join('\n').trim();
        if (!text)
            throw new Error('Empty response from Anthropic');
        return { text, model, provider: 'anthropic' };
    }
    // OpenAI-compatible (OpenAI, OpenRouter, Groq, custom)
    const body = JSON.stringify({
        model,
        temperature,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ]
    });
    const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer ' + cfg.apiKey
    };
    if (cfg.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://zaiken.app';
        headers['X-Title'] = 'Zaiken Coach';
    }
    const data = await _httpJson(base + '/chat/completions', {
        method: 'POST',
        headers,
        body
    });
    const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    if (!text)
        throw new Error('Empty response from model: ' + (data.error && data.error.message || 'unknown'));
    return { text: String(text).trim(), model, provider: cfg.provider };
}
function coachSystemPrompt(langHint) {
    return [
        'You are Zaiken Coach — an elite esports performance coach.',
        'Style: sharp, specific, actionable, no fluff, no cheating/exploits/account sharing.',
        'Always give concrete drills, routines, decision frameworks, and measurable goals.',
        'If web research notes are provided, use the freshest accurate public knowledge; say when patch meta may have shifted.',
        'Never invent fake match scores for the player. Use only the stats provided.',
        'If the question is not about games/training/esports/performance, briefly redirect to gaming coaching.',
        langHint === 'ar'
            ? 'Respond in clear Arabic (you may keep game terms in English).'
            : 'Respond in the same language the user used when possible.'
    ].join(' ');
}
function dailyReportSystem() {
    return [
        'You are Zaiken Coach writing a DAILY TRAINING REPORT for one esports title.',
        'Structure with markdown headings:',
        '1) Meta snapshot (current focus areas)',
        '2) Warm-up (10–20 min)',
        '3) Core drills (ranked/practice block)',
        '4) VOD / review checklist',
        '5) One measurable goal for today',
        'Be specific to the game named. No cheats. No filler.'
    ].join(' ');
}
/**
 * @param {object} db database module
 * @param {object} opts
 * @param {string} opts.message
 * @param {object} opts.stats profile-ish stats
 * @param {string} [opts.gameName]
 * @param {Array} [opts.history] prior messages {role, content}
 */
async function proxyPost(cfg, pathName, payload) {
    if (!cfg.proxyUrl)
        throw new Error('No proxyUrl');
    const url = cfg.proxyUrl.replace(/\/$/, '') + pathName;
    const headers = { 'content-type': 'application/json' };
    if (cfg.appSecret)
        headers.authorization = 'Bearer ' + cfg.appSecret;
    const body = JSON.stringify(payload || {});
    return _httpJson(url, { method: 'POST', headers, body, timeoutMs: 90000 });
}
async function askCoach(db, opts = {}) {
    const cfg = _settings(db);
    if (!cfg.apiKey && !cfg.proxyUrl) {
        return {
            ok: false,
            needsSetup: true,
            error: 'AI Coach needs either ai.config.json proxyUrl (recommended) or a local API key for dev only.'
        };
    }
    const gate = _rateCheck();
    if (!gate.ok)
        return { ok: false, error: gate.error };
    const message = String(opts.message || '').trim();
    if (!message)
        return { ok: false, error: 'Empty message' };
    const gameName = opts.gameName || (opts.stats && opts.stats.gameName) || 'general esports';
    const stats = opts.stats || {};
    const isAr = /[\u0600-\u06FF]/.test(message);
    // Preferred path: server proxy (API key never on the client)
    if (cfg.proxyUrl) {
        lastCallAt = Date.now();
        callsThisHour += 1;
        try {
            const data = await proxyPost(cfg, '/v1/coach', {
                message,
                gameName,
                stats: {
                    totalKills: stats.totalKills || stats.kills || 0,
                    totalDeaths: stats.totalDeaths || stats.deaths || 0,
                    totalWins: stats.totalWins || stats.wins || 0,
                    totalMatches: stats.totalMatches || stats.matches || 0,
                    rank: stats.rank,
                    level: stats.level
                }
            });
            if (!data.ok)
                return { ok: false, error: data.error || 'Proxy error' };
            return {
                ok: true,
                reply: data.reply,
                model: data.model,
                provider: data.provider || 'proxy',
                usedWebSearch: Boolean(data.usedWebSearch),
                via: 'proxy'
            };
        }
        catch (e) {
            return { ok: false, error: 'Proxy request failed: ' + e.message };
        }
    }
    let researchBlock = '';
    if (cfg.webSearch) {
        const searchQ = `${gameName} ${message} esports guide tips ${new Date().getFullYear()}`.slice(0, 180);
        try {
            const hits = await webResearch(searchQ);
            if (hits.length) {
                researchBlock = 'WEB RESEARCH NOTES:\n' + hits.map((h, i) => `(${i + 1}) ${h.title}\n${h.snippet}\n${h.url}`).join('\n\n');
            }
        }
        catch (e) {
            researchBlock = 'WEB RESEARCH: unavailable (' + e.message + ')';
        }
    }
    const userBlock = [
        `Game focus: ${gameName}`,
        `Player stats: K/D-related kills=${stats.totalKills || stats.kills || 0}, deaths=${stats.totalDeaths || stats.deaths || 0}, wins=${stats.totalWins || stats.wins || 0}, matches=${stats.totalMatches || stats.matches || 0}, rank=${stats.rank || 'n/a'}, level=${stats.level || 'n/a'}`,
        researchBlock,
        `Player question: ${message}`
    ].filter(Boolean).join('\n\n');
    lastCallAt = Date.now();
    callsThisHour += 1;
    try {
        const result = await callLLM(cfg, {
            system: coachSystemPrompt(isAr ? 'ar' : 'en'),
            user: userBlock,
            temperature: 0.65
        });
        return {
            ok: true,
            reply: result.text,
            model: result.model,
            provider: result.provider,
            usedWebSearch: Boolean(researchBlock && researchBlock.startsWith('WEB RESEARCH NOTES'))
        };
    }
    catch (e) {
        return { ok: false, error: 'AI request failed: ' + e.message };
    }
}
async function generateDailyReport(db, gameName) {
    const cfg = _settings(db);
    if (!cfg.apiKey && !cfg.proxyUrl) {
        return {
            ok: false,
            needsSetup: true,
            error: 'Configure proxyUrl or API key for daily reports.'
        };
    }
    const gate = _rateCheck();
    if (!gate.ok)
        return { ok: false, error: gate.error };
    const game = String(gameName || 'Valorant').trim();
    if (cfg.proxyUrl) {
        lastCallAt = Date.now();
        callsThisHour += 1;
        try {
            const data = await proxyPost(cfg, '/v1/daily-report', { gameName: game });
            if (!data.ok)
                return { ok: false, error: data.error || 'Proxy error' };
            try {
                if (data.report)
                    db.saveAIReport(data.report);
            }
            catch { }
            return { ok: true, report: data.report, via: 'proxy' };
        }
        catch (e) {
            return { ok: false, error: 'Proxy daily failed: ' + e.message };
        }
    }
    let researchBlock = '';
    if (cfg.webSearch) {
        try {
            const hits = await webResearch(`${game} esports meta training routine tips ${new Date().toISOString().slice(0, 10)}`);
            if (hits.length) {
                researchBlock = hits.map((h) => `- ${h.title}: ${h.snippet}`).join('\n');
            }
        }
        catch { }
    }
    lastCallAt = Date.now();
    callsThisHour += 1;
    try {
        const result = await callLLM(cfg, {
            system: dailyReportSystem(),
            user: `Create today's daily training report for: ${game}\nDate: ${new Date().toISOString().slice(0, 10)}\nResearch notes:\n${researchBlock || 'none'}`,
            temperature: 0.55
        });
        const report = {
            id: require('crypto').randomUUID(),
            game,
            title: `Daily Report — ${game}`,
            body: result.text,
            createdAt: new Date().toISOString(),
            model: result.model,
            provider: result.provider
        };
        try {
            db.saveAIReport(report);
        }
        catch { }
        return { ok: true, report };
    }
    catch (e) {
        return { ok: false, error: 'Daily report failed: ' + e.message };
    }
}
async function generateDailyReportsBatch(db, games) {
    const cfg = _settings(db);
    const list = (games && games.length) ? games : cfg.dailyGames;
    const out = [];
    for (const g of list.slice(0, 5)) {
        // sequential to respect rate limits
        const r = await generateDailyReport(db, g);
        out.push({ game: g, ...r });
        await new Promise((res) => setTimeout(res, RATE.minIntervalMs));
    }
    return { ok: true, results: out };
}
function getStatus(db) {
    const cfg = _settings(db);
    return {
        configured: Boolean(cfg.apiKey || cfg.proxyUrl),
        mode: cfg.proxyUrl ? 'proxy' : (cfg.apiKey ? 'direct' : 'none'),
        provider: cfg.proxyUrl ? 'proxy' : cfg.provider,
        model: cfg.model || _defaultModel(cfg.provider),
        webSearch: cfg.webSearch,
        proxyUrl: cfg.proxyUrl ? cfg.proxyUrl.replace(/^(https?:\/\/)[^/]+/, '$1***') : '',
        dailyGames: cfg.dailyGames,
        callsThisHour,
        maxPerHour: RATE.maxPerHour
    };
}
module.exports = {
    askCoach,
    generateDailyReport,
    generateDailyReportsBatch,
    getStatus,
    webResearch,
    ESPORT_DEFAULTS
};
