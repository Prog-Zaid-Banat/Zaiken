"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteGameRepository = void 0;
/**
 * SQLite Game repository
 * Copyright © 2026 Zaid Bilal Banat
 */
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const client_1 = require("../client");
const schema_1 = require("../schema");
function mapRow(row) {
    return {
        id: row.id,
        name: row.name,
        genre: row.genre,
        exePath: row.exePath,
        coverImage: row.coverImage,
        emoji: row.emoji,
        platform: row.platform,
        steamAppId: row.steamAppId,
        logPath: row.logPath,
        notes: row.notes,
        totalMinutes: row.totalMinutes,
        kills: row.kills,
        deaths: row.deaths,
        wins: row.wins,
        losses: row.losses,
        matches: row.matches,
        lastPlayedAt: row.lastPlayedAt,
        addedAt: row.addedAt,
        updatedAt: row.updatedAt,
    };
}
class SqliteGameRepository {
    async findAll() {
        const rows = (0, client_1.getDb)().select().from(schema_1.games).all();
        return rows.map(mapRow);
    }
    async findById(id) {
        const row = (0, client_1.getDb)().select().from(schema_1.games).where((0, drizzle_orm_1.eq)(schema_1.games.id, id)).get();
        return row ? mapRow(row) : null;
    }
    async add(input) {
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const entity = {
            id,
            name: input.name || 'New Game',
            genre: input.genre ?? 'Unknown',
            exePath: input.exePath ?? '',
            coverImage: input.coverImage ?? '',
            emoji: input.emoji ?? '🎮',
            platform: input.platform ?? 'custom',
            steamAppId: input.steamAppId ?? null,
            logPath: input.logPath ?? '',
            notes: input.notes ?? '',
            totalMinutes: 0,
            kills: 0,
            deaths: 0,
            wins: 0,
            losses: 0,
            matches: 0,
            lastPlayedAt: null,
            addedAt: now,
            updatedAt: now,
        };
        (0, client_1.getDb)().insert(schema_1.games).values(entity).run();
        return mapRow(entity);
    }
    async update(id, data) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const { id: _i, addedAt: _a, ...rest } = data;
        const patch = { updatedAt: new Date().toISOString() };
        if (rest.name !== undefined)
            patch.name = rest.name;
        if (rest.genre !== undefined)
            patch.genre = rest.genre;
        if (rest.exePath !== undefined)
            patch.exePath = rest.exePath;
        if (rest.coverImage !== undefined)
            patch.coverImage = rest.coverImage;
        if (rest.emoji !== undefined)
            patch.emoji = rest.emoji;
        if (rest.platform !== undefined)
            patch.platform = rest.platform;
        if (rest.steamAppId !== undefined)
            patch.steamAppId = rest.steamAppId;
        if (rest.logPath !== undefined)
            patch.logPath = rest.logPath;
        if (rest.notes !== undefined)
            patch.notes = rest.notes;
        if (rest.totalMinutes !== undefined)
            patch.totalMinutes = rest.totalMinutes;
        if (rest.kills !== undefined)
            patch.kills = rest.kills;
        if (rest.deaths !== undefined)
            patch.deaths = rest.deaths;
        if (rest.wins !== undefined)
            patch.wins = rest.wins;
        if (rest.losses !== undefined)
            patch.losses = rest.losses;
        if (rest.matches !== undefined)
            patch.matches = rest.matches;
        if (rest.lastPlayedAt !== undefined)
            patch.lastPlayedAt = rest.lastPlayedAt;
        (0, client_1.getDb)().update(schema_1.games).set(patch).where((0, drizzle_orm_1.eq)(schema_1.games.id, id)).run();
        return this.findById(id);
    }
    async delete(id) {
        (0, client_1.getDb)().delete(schema_1.games).where((0, drizzle_orm_1.eq)(schema_1.games.id, id)).run();
        return true;
    }
}
exports.SqliteGameRepository = SqliteGameRepository;
