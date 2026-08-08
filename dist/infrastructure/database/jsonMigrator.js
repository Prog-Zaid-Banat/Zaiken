"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateFromJsonIfNeeded = migrateFromJsonIfNeeded;
/**
 * One-shot migrator: legacy signed JSON stores → SQLite
 * Copyright © 2026 Zaid Bilal Banat
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const client_1 = require("./client");
const schema_1 = require("./schema");
const Logger_1 = require("../logging/Logger");
const SecretStore_1 = require("../secrets/SecretStore");
const log = (0, Logger_1.createLogger)('database');
function readJsonStore(dataDir, name) {
    const fp = path_1.default.join(dataDir, `${name}.json`);
    if (!fs_1.default.existsSync(fp))
        return null;
    try {
        const raw = JSON.parse(fs_1.default.readFileSync(fp, 'utf8'));
        if (raw && raw.data !== undefined)
            return raw.data;
        return raw;
    }
    catch (e) {
        log.warn({ name, err: e?.message }, 'failed reading legacy store');
        return null;
    }
}
function migrateFromJsonIfNeeded(jsonDataDir, sqlitePath) {
    (0, client_1.initDatabase)(sqlitePath);
    const conn = (0, client_1.getSqlite)();
    const already = conn.prepare(`SELECT value FROM schema_meta WHERE key = 'migrated_from_json'`).get();
    if (already?.value === 'true') {
        return { migrated: false, reason: 'already_migrated' };
    }
    if (!fs_1.default.existsSync(jsonDataDir)) {
        seedDefaults();
        conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('migrated_from_json', 'true')`).run();
        return { migrated: false, reason: 'no_json_dir' };
    }
    // backup
    const backupDir = `${jsonDataDir}_backup_${Date.now()}`;
    try {
        fs_1.default.cpSync(jsonDataDir, backupDir, { recursive: true });
        log.info({ backupDir }, 'JSON backup created');
    }
    catch (e) {
        log.warn({ err: e?.message }, 'backup failed — continuing carefully');
    }
    const tx = conn.transaction(() => {
        const gamesData = readJsonStore(jsonDataDir, 'games') || [];
        for (const g of gamesData) {
            (0, client_1.getDb)()
                .insert(schema_1.games)
                .values({
                id: g.id || (0, crypto_1.randomUUID)(),
                name: g.name || 'Game',
                genre: g.genre ?? null,
                exePath: g.exePath ?? null,
                coverImage: g.coverImage ?? null,
                emoji: g.emoji ?? '🎮',
                platform: g.platform || 'custom',
                steamAppId: g.steamAppId ?? null,
                logPath: g.logPath ?? null,
                notes: g.notes ?? null,
                totalMinutes: g.totalMinutes || 0,
                kills: g.kills || 0,
                deaths: g.deaths || 0,
                wins: g.wins || 0,
                losses: g.losses || 0,
                matches: g.matches || 0,
                lastPlayedAt: g.lastPlayed || null,
                addedAt: g.addedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
                .onConflictDoNothing()
                .run();
        }
        const sessionsData = readJsonStore(jsonDataDir, 'sessions') || [];
        for (const s of sessionsData) {
            (0, client_1.getDb)()
                .insert(schema_1.playSessions)
                .values({
                id: s.id || (0, crypto_1.randomUUID)(),
                gameId: s.gameId,
                minutes: s.minutes || 0,
                kills: s.kills || 0,
                deaths: s.deaths || 0,
                wins: s.wins || 0,
                losses: s.losses || 0,
                matches: s.matches || 0,
                startedAt: null,
                endedAt: s.date || new Date().toISOString(),
            })
                .onConflictDoNothing()
                .run();
        }
        const profile = readJsonStore(jsonDataDir, 'profile');
        if (profile) {
            (0, client_1.getDb)()
                .insert(schema_1.profiles)
                .values({
                id: profile.id || (0, crypto_1.randomUUID)(),
                username: profile.username || 'Player',
                avatarPath: profile.avatar || null,
                rank: profile.rank || 'Bronze',
                level: profile.level || 1,
                xp: profile.xp || 0,
                xpMax: profile.xpMax || 1000,
                bio: profile.bio || null,
                country: profile.country || null,
                totalWins: profile.totalWins || 0,
                totalLosses: profile.totalLosses || 0,
                totalKills: profile.totalKills || 0,
                totalDeaths: profile.totalDeaths || 0,
                totalMatches: profile.totalMatches || 0,
                winStreak: profile.winStreak || 0,
                bestWinStreak: profile.bestWinStreak || 0,
                reactionTimeMs: profile.reactionTimeMs || 0,
                reactionSamples: profile.reactionSamples || 0,
                joinDate: profile.joinDate || new Date().toISOString(),
            })
                .onConflictDoNothing()
                .run();
        }
        else {
            seedDefaultProfile();
        }
        const ach = readJsonStore(jsonDataDir, 'achievements') || [];
        ach.forEach((a, idx) => {
            (0, client_1.getDb)()
                .insert(schema_1.achievements)
                .values({
                id: a.id || (0, crypto_1.randomUUID)(),
                code: a.id || `ach_${idx}`,
                name: a.name || 'Achievement',
                description: a.desc || a.description || null,
                icon: a.icon || null,
                goal: a.goal || 1,
                progress: a.progress || 0,
                unlocked: a.unlocked ? 1 : 0,
                unlockedAt: a.unlockedAt || null,
                sortOrder: idx,
            })
                .onConflictDoNothing()
                .run();
        });
        const reports = readJsonStore(jsonDataDir, 'ai_reports') || [];
        for (const r of reports) {
            (0, client_1.getDb)()
                .insert(schema_1.aiReports)
                .values({
                id: r.id || (0, crypto_1.randomUUID)(),
                gameName: r.gameName || r.game || null,
                title: r.title || null,
                content: r.content || r.text || '',
                provider: r.provider || null,
                model: r.model || null,
                createdAt: r.createdAt || new Date().toISOString(),
            })
                .onConflictDoNothing()
                .run();
        }
        const s = readJsonStore(jsonDataDir, 'settings') || {};
        // strip secrets from settings before DB
        const { aiApiKey, aiAppSecret, ...safeSettings } = s;
        (0, client_1.getDb)()
            .insert(schema_1.settings)
            .values({
            key: 'app',
            valueJson: JSON.stringify(safeSettings),
            updatedAt: new Date().toISOString(),
        })
            .onConflictDoNothing()
            .run();
        // users
        const usersData = readJsonStore(jsonDataDir, 'users') || [];
        for (const u of usersData) {
            (0, client_1.getDb)()
                .insert(schema_1.users)
                .values({
                id: u.id || (0, crypto_1.randomUUID)(),
                email: u.email,
                passwordHash: u.passwordHash,
                salt: u.salt,
            })
                .onConflictDoNothing()
                .run();
        }
        conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('migrated_from_json', 'true')`).run();
    });
    tx();
    // move API key to secret store asynchronously-safe sync path
    const legacySettings = readJsonStore(jsonDataDir, 'settings') || {};
    if (legacySettings.aiApiKey) {
        const store = (0, SecretStore_1.getSecretStore)();
        // init is async; fire and forget with require sync path already handled in store memory/keytar
        Promise.resolve(store.init())
            .then(() => store.set('ai.api_key', String(legacySettings.aiApiKey)))
            .then(() => log.info('migrated aiApiKey into SecretStore'))
            .catch((e) => log.warn({ err: e?.message }, 'secret migration failed'));
    }
    log.info('JSON → SQLite migration complete');
    return { migrated: true };
}
function seedDefaultProfile() {
    (0, client_1.getDb)()
        .insert(schema_1.profiles)
        .values({
        id: (0, crypto_1.randomUUID)(),
        username: 'Player',
        rank: 'Bronze',
        level: 1,
        xp: 0,
        xpMax: 1000,
        joinDate: new Date().toISOString(),
    })
        .run();
}
function seedDefaults() {
    seedDefaultProfile();
    const defaults = [
        { code: 'headshot_king', name: 'Headshot King', description: '500 headshots total', icon: '🎯', goal: 500 },
        { code: 'first_blood', name: 'First Blood', description: 'Win your first recorded match', icon: '🏆', goal: 1 },
        { code: 'speed_demon', name: 'Speed Demon', description: 'Sub-150ms avg reaction time', icon: '⚡', goal: 1 },
        { code: 'on_fire', name: 'On Fire', description: '10-win streak', icon: '🔥', goal: 10 },
        { code: 'diamond_elite', name: 'Diamond Elite', description: 'Reach Diamond rank', icon: '💎', goal: 1 },
        { code: 'marathon', name: 'Marathon', description: '1000 hours total played', icon: '🎮', goal: 60000 },
    ];
    defaults.forEach((a, idx) => {
        (0, client_1.getDb)()
            .insert(schema_1.achievements)
            .values({
            id: (0, crypto_1.randomUUID)(),
            code: a.code,
            name: a.name,
            description: a.description,
            icon: a.icon,
            goal: a.goal,
            progress: 0,
            unlocked: 0,
            sortOrder: idx,
        })
            .run();
    });
}
