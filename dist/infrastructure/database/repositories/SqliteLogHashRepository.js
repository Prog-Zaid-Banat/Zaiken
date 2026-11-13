"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteLogHashRepository = void 0;
const crypto_1 = require("crypto");
const databaseProvider_1 = require("../../../main/ipc/databaseProvider");
class SqliteLogHashRepository {
    db() {
        return (0, databaseProvider_1.getDatabase)().getConnection();
    }
    saveLogHash(input) {
        const id = (0, crypto_1.randomUUID)();
        const createdAt = new Date().toISOString();
        this.db()
            .prepare(`
INSERT INTO log_hashes (id, game_id, path, hash, size, created_at)
VALUES (?, ?, ?, ?, ?, ?)
`)
            .run(id, input.gameId, input.path, input.hash, input.size, createdAt);
        return {
            id,
            gameId: input.gameId,
            path: input.path,
            hash: input.hash,
            size: input.size,
            createdAt,
        };
    }
    getByGame(gameId, limit = 50) {
        const n = Math.max(1, Math.min(500, Math.floor(limit) || 50));
        return this.db()
            .prepare(`
SELECT id, game_id AS gameId, path, hash, size, created_at AS createdAt
FROM log_hashes
WHERE game_id = ?
ORDER BY created_at DESC
LIMIT ?
`)
            .all(gameId, n);
    }
    latestHashForPath(path) {
        const row = this.db()
            .prepare(`
SELECT hash FROM log_hashes
WHERE path = ?
ORDER BY created_at DESC
LIMIT 1
`)
            .get(path);
        return row ? row.hash : null;
    }
}
exports.SqliteLogHashRepository = SqliteLogHashRepository;
