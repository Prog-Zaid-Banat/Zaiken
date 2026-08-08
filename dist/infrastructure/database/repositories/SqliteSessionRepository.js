"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSessionRepository = void 0;
/**
 * SQLite Session repository
 * Copyright © 2026 Zaid Bilal Banat
 */
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const client_1 = require("../client");
const schema_1 = require("../schema");
const RankCalculator_1 = require("../../../domain/services/RankCalculator");
const schema_2 = require("../schema");
function mapRow(row) {
    return {
        id: row.id,
        gameId: row.gameId,
        minutes: row.minutes,
        kills: row.kills ?? 0,
        deaths: row.deaths ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        matches: row.matches ?? 0,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        createdAt: row.createdAt,
    };
}
class SqliteSessionRepository {
    async add(input) {
        const id = input.id || (0, crypto_1.randomUUID)();
        const minutes = Math.max(0, Math.round(Number(input.minutes) || 0));
        const endedAt = input.endedAt || new Date().toISOString();
        const conn = (0, client_1.getSqlite)();
        const tx = conn.transaction(() => {
            (0, client_1.getDb)()
                .insert(schema_1.playSessions)
                .values({
                id,
                gameId: input.gameId,
                minutes,
                kills: input.kills ?? 0,
                deaths: input.deaths ?? 0,
                wins: input.wins ?? 0,
                losses: input.losses ?? 0,
                matches: input.matches ?? 0,
                startedAt: input.startedAt ?? null,
                endedAt,
            })
                .run();
            // update aggregate on game
            const game = (0, client_1.getDb)().select().from(schema_1.games).where((0, drizzle_orm_1.eq)(schema_1.games.id, input.gameId)).get();
            if (game) {
                (0, client_1.getDb)()
                    .update(schema_1.games)
                    .set({
                    totalMinutes: (game.totalMinutes || 0) + minutes,
                    lastPlayedAt: endedAt,
                    kills: (game.kills || 0) + (input.kills || 0),
                    deaths: (game.deaths || 0) + (input.deaths || 0),
                    wins: (game.wins || 0) + (input.wins || 0),
                    losses: (game.losses || 0) + (input.losses || 0),
                    matches: (game.matches || 0) + (input.matches || 0),
                    updatedAt: new Date().toISOString(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.games.id, input.gameId))
                    .run();
            }
            // XP on profile
            if (minutes > 0) {
                const profile = (0, client_1.getDb)().select().from(schema_2.profiles).all()[0];
                if (profile) {
                    const next = (0, RankCalculator_1.applyPlaytimeXp)({ xp: profile.xp, xpMax: profile.xpMax, level: profile.level }, minutes);
                    const rank = (0, RankCalculator_1.computeRank)({
                        totalWins: profile.totalWins,
                        totalKills: profile.totalKills,
                        level: next.level,
                    });
                    (0, client_1.getDb)()
                        .update(schema_2.profiles)
                        .set({
                        xp: next.xp,
                        xpMax: next.xpMax,
                        level: next.level,
                        rank,
                        updatedAt: new Date().toISOString(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_2.profiles.id, profile.id))
                        .run();
                }
            }
        });
        tx();
        const row = (0, client_1.getDb)().select().from(schema_1.playSessions).where((0, drizzle_orm_1.eq)(schema_1.playSessions.id, id)).get();
        return mapRow(row);
    }
    async findByGame(gameId) {
        return (0, client_1.getDb)()
            .select()
            .from(schema_1.playSessions)
            .where((0, drizzle_orm_1.eq)(schema_1.playSessions.gameId, gameId))
            .all()
            .map(mapRow);
    }
    async findRecent(limit) {
        return (0, client_1.getDb)()
            .select()
            .from(schema_1.playSessions)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.playSessions.endedAt))
            .limit(limit)
            .all()
            .map(mapRow);
    }
    async dailyStats(days = 7) {
        const all = (0, client_1.getDb)().select().from(schema_1.playSessions).all();
        return Array.from({ length: days }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            const dateStr = d.toISOString().split('T')[0];
            const day = all.filter((s) => s.endedAt && s.endedAt.startsWith(dateStr));
            return {
                date: dateStr,
                minutes: day.reduce((a, s) => a + (s.minutes || 0), 0),
                sessions: day.length,
            };
        });
    }
}
exports.SqliteSessionRepository = SqliteSessionRepository;
