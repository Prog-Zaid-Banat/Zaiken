/**
 * Zaiken – Secure IPC Bridge (JavaScript version – drop-in)
 * Works with your existing plain-JS project without TypeScript build step.
 * Copyright © 2026
 */
'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const { z } = require('zod');
// ─── Channels ───────────────────────────────────────────────
const IpcChannels = {
    GET_GAMES: 'zaiken:get-games',
    LAUNCH_GAME: 'zaiken:launch-game',
    GET_SYSTEM_METRICS: 'zaiken:get-system-metrics',
    ASK_COACH: 'zaiken:ask-coach',
    GET_PROFILE: 'zaiken:get-profile',
    GET_SETTINGS: 'zaiken:get-settings',
    SAVE_SETTINGS: 'zaiken:save-settings',
    GET_ACHIEVEMENTS: 'zaiken:get-achievements',
    METRICS_UPDATE: 'zaiken:metrics-update',
    SESSION_ENDED: 'zaiken:session-ended',
    GAMES_UPDATED: 'zaiken:games-updated',
};
// ─── Schemas ────────────────────────────────────────────────
const GameSchema = z
    .object({
    id: z.string(),
    name: z.string(),
    platform: z.string().default('custom'),
    exePath: z.string().optional().nullable(),
    coverImage: z.string().optional().nullable(),
    emoji: z.string().optional().nullable(),
    totalMinutes: z.number().nonnegative().default(0),
    lastPlayed: z.string().nullable().optional(),
    steamAppId: z.union([z.string(), z.number()]).nullable().optional(),
})
    .passthrough();
const GetGamesResponse = z.object({ games: z.array(GameSchema) }).strict();
const LaunchGameRequest = z.object({ gameId: z.string().min(1) }).strict();
const LaunchGameResponse = z
    .object({
    ok: z.boolean(),
    pid: z.number().int().positive().optional(),
    error: z.string().optional(),
})
    .strict();
const SystemMetrics = z
    .object({
    cpu: z.number().min(0).max(100),
    ramUsedMb: z.number().nonnegative(),
    ramTotalMb: z.number().positive(),
    gpu: z.number().min(0).max(100).optional().nullable(),
    pingMs: z.number().nonnegative().optional().nullable(),
    timestamp: z.number().int(),
})
    .strict();
const AskCoachRequest = z
    .object({
    question: z.string().min(1).max(4000),
    gameId: z.string().optional(),
    lang: z.enum(['en', 'ar']).default('en'),
})
    .strict();
const AskCoachResponse = z
    .object({
    ok: z.boolean(),
    answer: z.string().optional(),
    needsSetup: z.boolean().optional(),
    error: z.string().optional(),
})
    .strict();
const ProfileSchema = z
    .object({
    id: z.string(),
    username: z.string(),
})
    .passthrough();
const SettingsSchema = z.record(z.unknown()).or(z.object({}).passthrough());
const SaveSettingsRequest = z.object({ settings: z.record(z.unknown()) }).strict();
const SaveSettingsResponse = z
    .object({ ok: z.boolean(), error: z.string().optional() })
    .strict();
const GetAchievementsResponse = z
    .object({
    achievements: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
})
    .strict();
// ─── Optional Native Daemon reference ───────────────────────
let _daemon = null;
function setDaemon(d) {
    _daemon = d;
}
// ─── Load existing modules ──────────────────────────────────
let db;
let aiCoach;
try {
    db = require('../database.legacy');
}
catch {
    try {
        db = require('../database');
    }
    catch {
        console.warn('[ipc-bridge] database not found – using stubs');
        db = {
            getGames: () => [],
            getProfile: () => ({ id: 'stub', username: 'Player' }),
            getSettings: () => ({}),
            _read: (s) => (s === 'profile' ? { id: 'stub', username: 'Player' } : []),
        };
    }
}
try {
    aiCoach = require('../services/aicoach');
}
catch {
    try {
        aiCoach = require('../services/aicoach');
    }
    catch {
        console.warn('[ipc-bridge] aicoach not found – using stub');
        aiCoach = {
            askCoach: async () => ({
                ok: false,
                needsSetup: true,
                error: 'AI Coach module not loaded',
            }),
        };
    }
}
// ─── Register helper ────────────────────────────────────────
function register(channel, reqSchema, resSchema, handler) {
    ipcMain.handle(channel, async (event, raw) => {
        try {
            const parsedReq = reqSchema ? reqSchema.parse(raw ?? {}) : {};
            const result = await handler(parsedReq, event);
            return resSchema.parse(result);
        }
        catch (err) {
            console.error(`[IPC] ${channel} →`, err && err.message ? err.message : err);
            if (resSchema && resSchema.shape && 'ok' in resSchema.shape) {
                return { ok: false, error: (err && err.message) || 'Internal error' };
            }
            throw err;
        }
    });
}
// ─── Public ─────────────────────────────────────────────────
function setupSecureIpc() {
    register(IpcChannels.GET_GAMES, null, GetGamesResponse, async () => {
        const { getGameRepository } = require("./repositoryProvider");
        const repository = getGameRepository();
        const games = await repository.findAll();
        return {
            games
        };
    });
    register(IpcChannels.LAUNCH_GAME, LaunchGameRequest, LaunchGameResponse, async (req) => {
        const games = typeof db.getGames === 'function' ? db.getGames() : (db._read && db._read('games')) || [];
        const game = (games || []).find((g) => g.id === req.gameId);
        if (!game)
            return { ok: false, error: 'Game not found' };
        // Keep your existing launch code – just call it here later
        console.log('[IPC] Launch requested:', game.name);
        return { ok: true };
    });
    register(IpcChannels.GET_SYSTEM_METRICS, null, SystemMetrics, async () => {
        if (_daemon && typeof _daemon.getMetrics === 'function') {
            return _daemon.getMetrics();
        }
        return {
            cpu: 0,
            ramUsedMb: 0,
            ramTotalMb: 8,
            gpu: null,
            pingMs: null,
            timestamp: Date.now(),
        };
    });
    register(IpcChannels.ASK_COACH, AskCoachRequest, AskCoachResponse, async (req) => {
        if (typeof aiCoach.askCoach === 'function') {
            return aiCoach.askCoach(db, {
                question: req.question,
                gameId: req.gameId,
                lang: req.lang,
            });
        }
        return { ok: false, needsSetup: true, error: 'AI Coach not available' };
    });
    register(IpcChannels.GET_PROFILE, null, ProfileSchema, async () => {
        if (typeof db.getProfile === 'function')
            return db.getProfile();
        return (db._read && db._read('profile')) || { id: 'unknown', username: 'Player' };
    });
    register(IpcChannels.GET_SETTINGS, null, SettingsSchema, async () => {
        if (typeof db.getSettings === 'function')
            return db.getSettings() || {};
        return (db._read && db._read('settings')) || {};
    });
    register(IpcChannels.SAVE_SETTINGS, SaveSettingsRequest, SaveSettingsResponse, async (req) => {
        try {
            if (typeof db.saveSettings === 'function')
                db.saveSettings(req.settings);
            else if (typeof db._write === 'function')
                db._write('settings', req.settings);
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: (e && e.message) || 'Failed to save' };
        }
    });
    register(IpcChannels.GET_ACHIEVEMENTS, null, GetAchievementsResponse, async () => {
        const list = typeof db.getAchievements === 'function'
            ? db.getAchievements()
            : (db._read && db._read('achievements')) || [];
        return { achievements: Array.isArray(list) ? list : [] };
    });
    console.log('[Zaiken] Secure IPC bridge ready (JS)');
}
function broadcastMetrics(metrics) {
    const parsed = SystemMetrics.safeParse(metrics);
    if (!parsed.success)
        return;
    BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed())
            win.webContents.send(IpcChannels.METRICS_UPDATE, parsed.data);
    });
}
function broadcastGamesUpdated() {
    BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed())
            win.webContents.send(IpcChannels.GAMES_UPDATED);
    });
}
module.exports = {
    setupSecureIpc,
    broadcastMetrics,
    broadcastGamesUpdated,
    setDaemon,
    IpcChannels,
};
