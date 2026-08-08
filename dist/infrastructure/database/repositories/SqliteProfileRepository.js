"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteProfileRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const client_1 = require("../client");
const schema_1 = require("../schema");
class SqliteProfileRepository {
    async findCurrent() {
        const row = (0, client_1.getDb)()
            .select()
            .from(schema_1.profiles)
            .limit(1)
            .get();
        if (!row) {
            const id = (0, crypto_1.randomUUID)();
            const now = new Date().toISOString();
            const newProfile = {
                id,
                userId: null,
                username: "Player",
                avatarPath: null,
                rank: "Bronze",
                level: 1,
                xp: 0,
                xpMax: 1000,
                bio: "",
                country: "",
                totalWins: 0,
                totalLosses: 0,
                totalKills: 0,
                totalDeaths: 0,
                totalMatches: 0,
                winStreak: 0,
                bestWinStreak: 0,
                reactionTimeMs: 0,
                reactionSamples: 0,
                joinDate: now,
                updatedAt: now
            };
            (0, client_1.getDb)()
                .insert(schema_1.profiles)
                .values(newProfile)
                .run();
            return newProfile;
        }
        return row;
    }
    async update(data) {
        const current = await this.findCurrent();
        (0, client_1.getDb)()
            .update(schema_1.profiles)
            .set({
            username: data.username ??
                current.username,
            bio: data.bio ??
                current.bio,
            country: data.country ??
                current.country,
            updatedAt: new Date().toISOString()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.profiles.id, current.id))
            .run();
        return this.findCurrent();
    }
}
exports.SqliteProfileRepository = SqliteProfileRepository;
