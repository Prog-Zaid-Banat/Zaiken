// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

const http = require('http');
const https = https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---- load .env (no dependency) ----
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
})();

const jwt = require('jsonwebtoken');

const PORT = Number(process.env.PORT || 8787);
const ZAIKEN_JWT_SECRET = (process.env.ZAIKEN_JWT_SECRET || '').trim();

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const AI_API_KEY = (process.env.AI_API_KEY || process.env.GROQ_API_KEY || '').trim();
const AI_MODEL = (process.env.AI_MODEL || '').trim();
const AI_BASE_URL = (process.env.AI_BASE_URL || '').trim();
const WEB_SEARCH = String(process.env.WEB_SEARCH || 'true') !== 'false';
const LIMIT_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 20);
const LIMIT_DAY = Number(process.env.RATE_LIMIT_PER_DAY || 300);

if (!AI_API_KEY) {
  console.error('[fatal] AI_API_KEY missing. Copy .env.example -> .env');
  process.exit(1);
}
if (!ZAIKEN_JWT_SECRET) {
  console.error('[fatal] ZAIKEN_JWT_SECRET is missing. Generate a dedicated random secret for Zaiken tokens.');
  process.exit(1);
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function httpJson(urlStr, { method = 'GET', headers = {}, body = null, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
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
        if (res.statusCode >= 400) return reject(new Error(`Upstream ${res.statusCode}: ${text.slice(0, 500)}`));
        try { resolve(text ? JSON.parse(text) : {}); } catch { resolve({ raw: text }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Upstream timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function webResearch(query) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q || !WEB_SEARCH) return [];
  const results = [];
  try {
    const data = await httpJson(
      'https://api.duckduckgo.com/?q=' + encodeURIComponent(q) + '&format=json&no_html=1&skip_disambig=1',
      { timeoutMs: 12000 }
    );
    if (data.AbstractText) {
      results.push({ title: data.Heading || 'Summary', snippet: data.AbstractText, url: data.AbstractURL || '' });
    }
    for (const item of (data.RelatedTopics || []).slice(0, 6)) {
      if (item.Text) results.push({ title: item.Text.slice(0, 80), snippet: item.Text, url: item.FirstURL || '' });
      else if (item.Topics) {
        for (const t of item.Topics.slice(0, 2)) {
          if (t.Text) results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL || '' });
        }
      }
    }
  } catch (e) {
    console.warn('[search]', e.message);
  }
  try {
    const wiki = await httpJson(
      'https://en.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&search=' + encodeURIComponent(q),
      { timeoutMs: 10000 }
    );
    if (Array.isArray(wiki) && wiki[1]) {
      for (let i = 0; i < wiki[1].length; i++) {
        results.push({ title: wiki[1][i], snippet: 'Wikipedia: ' + wiki[1][i], url: wiki[3][i] });
      }
    }
  } catch {}
  const seen = new Set();
  return results.filter((r) => {
    const k = (r.snippet || '').slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

function defaultModel() {
  if (AI_MODEL) return AI_MODEL;
  if (AI_PROVIDER === 'anthropic') return 'claude-sonnet-4-20250514';
  if (AI_PROVIDER === 'openrouter') return 'openai/gpt-4o-mini';
  if (AI_PROVIDER === 'groq') return 'llama-3.3-70b-versatile';
  return 'gpt-4o-mini';
}

function endpointBase() {
  if (AI_BASE_URL) return AI_BASE_URL.replace(/\/$/, '');
  if (AI_PROVIDER === 'anthropic') return 'https://api.anthropic.com/v1';
  if (AI_PROVIDER === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (AI_PROVIDER === 'groq') return 'https://api.groq.com/openai/v1';
  return 'https://api.openai.com/v1';
}

async function callLLM({ system, user, temperature = 0.65 }) {
  const model = defaultModel();
  const base = endpointBase();

  if (AI_PROVIDER === 'anthropic') {
    const body = JSON.stringify({
      model, max_tokens: 2500, temperature, system,
      messages: [{ role: 'user', content: user }]
    });
    const data = await httpJson(base + '/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body
    });
    const text = (data.content || []).map((c) => c.text || '').join('\n').trim();
    if (!text) throw new Error('Empty Anthropic response');
    return { text, model, provider: AI_PROVIDER };
  }

  const body = JSON.stringify({
    model,
    temperature,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });
  const headers = {
    'content-type': 'application/json',
    authorization: 'Bearer ' + AI_API_KEY
  };
  if (AI_PROVIDER === 'openrouter') {
    headers['HTTP-Referer'] = 'https://zaiken.app';
    headers['X-Title'] = 'Zaiken Coach Server';
  }
  const data = await httpJson(base + '/chat/completions', { method: 'POST', headers, body });
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty model response');
  return { text: String(text).trim(), model, provider: AI_PROVIDER };
}

const COACH_SYSTEM = [
  'You are Zaiken Coach — an elite, world-class esports performance coach.',
  'You think like a pro analyst + head coach: specific, ruthless on bad habits, encouraging on process.',
  'Always deliver: concrete drills, timers, measurable goals, decision trees, and common mistake fixes.',
  'Use any WEB RESEARCH notes as supporting context; prefer accurate public knowledge; note when meta may have patched.',
  'Never promote cheats, exploits, account sharing, boosting scams, or ToS violations.',
  'Never invent the player\'s match history. Only use stats they provided.',
  'Match the user\'s language (Arabic or English). Keep game terms clear.',
  'Structure long answers with short headers and bullet drills when helpful.'
].join(' ');

const DAILY_SYSTEM = [
  'You are Zaiken Coach writing a high-intensity DAILY TRAINING REPORT for one esports title.',
  'Markdown structure required:',
  '## Meta focus',
  '## Warm-up (12–20 min)',
  '## Core block (ranked / scrim intent)',
  '## VOD review checklist',
  '## One measurable goal today',
  '## Tilt / recovery rule',
  'Be game-specific, current, and actionable. No filler. No cheats.'
].join(' ');

async function handleCoach(body) {
  const message = String(body.message || body.query || '').trim();
  if (!message) throw new Error('message required');
  const gameName = String(body.gameName || body.game || 'general esports').trim();
  const stats = body.stats || {};

  let research = '';
  if (WEB_SEARCH) {
    const hits = await webResearch(`${gameName} ${message} esports guide tips training ${new Date().getFullYear()}`);
    if (hits.length) {
      research = 'WEB RESEARCH NOTES:\n' + hits.map((h, i) => `(${i + 1}) ${h.title}\n${h.snippet}\n${h.url}`).join('\n\n');
    }
  }

  const user = [
    `Game focus: ${gameName}`,
    `Player stats JSON: ${JSON.stringify({
      kills: stats.totalKills || stats.kills || 0,
      deaths: stats.totalDeaths || stats.deaths || 0,
      wins: stats.totalWins || stats.wins || 0,
      matches: stats.totalMatches || stats.matches || 0,
      rank: stats.rank || null,
      level: stats.level || null
    })}`,
    research,
    `Player question:\n${message}`
  ].filter(Boolean).join('\n\n');

  const result = await callLLM({ system: COACH_SYSTEM, user, temperature: 0.6 });
  return {
    ok: true,
    reply: result.text,
    model: result.model,
    provider: result.provider,
    usedWebSearch: Boolean(research)
  };
}

async function handleDaily(body) {
  const game = String(body.gameName || body.game || 'Valorant').trim();
  let research = '';
  if (WEB_SEARCH) {
    const hits = await webResearch(`${game} esports meta daily training routine tips`);
    if (hits.length) research = hits.map((h) => `- ${h.title}: ${h.snippet}`).join('\n');
  }
  const user = `Create today's elite daily training report for: ${game}\nDate: ${new Date().toISOString().slice(0, 10)}\nResearch:\n${research || 'none'}`;
  const result = await callLLM({ system: DAILY_SYSTEM, user, temperature: 0.55 });
  return {
    ok: true,
    report: {
      id: crypto.randomUUID(),
      game,
      title: `Daily Report — ${game}`,
      body: result.text,
      createdAt: new Date().toISOString(),
      model: result.model,
      provider: result.provider
    }
  };
}

// ---- Rate Limiting Setup ----
const rateLimits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimits.entries()) {
    if (now - data.lastUpdated > 24 * 60 * 60 * 1000) {
      rateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000);

function checkRateLimit(req) {
  const ip = req.socket.remoteAddress || '127.0.0.1';
  const identifier = req.user ? req.user.sub : ip;

  const now = Date.now();
  if (!rateLimits.has(identifier)) {
    rateLimits.set(identifier, { minCount: 0, minReset: now + 60000, dayCount: 0, dayReset: now + 86400000, lastUpdated: now });
  }

  const record = rateLimits.get(identifier);
  record.lastUpdated = now;

  if (now > record.minReset) {
    record.minCount = 0;
    record.minReset = now + 60000;
  }

  if (now > record.dayReset) {
    record.dayCount = 0;
    record.dayReset = now + 86400000;
  }

  record.minCount++;
  record.dayCount++;

  if (record.minCount > LIMIT_MIN || record.dayCount > LIMIT_DAY) {
    return { ok: false, error: 'Rate limit exceeded. Please try again later.' };
  }

  return { ok: true };
}

// ---- HTTP Server ----
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  const u = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && u.pathname === '/health') {
    return send(res, 200, {
      ok: true,
      service: 'zaiken-ai-server',
      provider: AI_PROVIDER,
      model: defaultModel(),
      webSearch: WEB_SEARCH,
      hasKey: Boolean(AI_API_KEY)
    });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return send(res, 401, { error: 'Unauthorized: Missing token' });
  }

  try {
    const user = jwt.verify(token, ZAIKEN_JWT_SECRET, { algorithms: ['HS256'] });
    req.user = user; 
  } catch (err) {
    return send(res, 403, { error: 'Forbidden: Invalid or expired token' });
  }

  // فحص معدل الاستخدام وتجنب انهيار المتغيرات
  const gate = checkRateLimit(req);
  if (!gate.ok && u.pathname !== '/health') {
    return send(res, 429, gate);
  }

  try {
    if (req.method === 'POST' && u.pathname === '/v1/coach') {
      const body = await readBody(req);
      const out = await handleCoach(body);
      return send(res, 200, out);
    }
    if (req.method === 'POST' && u.pathname === '/v1/daily-report') {
      const body = await readBody(req);
      const out = await handleDaily(body);
      return send(res, 200, out);
    }
    return send(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    console.error('[error]', e);
    return send(res, 500, { ok: false, error: e.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[zaiken-ai-server] listening on :${PORT}`);
  console.log(`[zaiken-ai-server] provider=${AI_PROVIDER} model=${defaultModel()}`);
});
