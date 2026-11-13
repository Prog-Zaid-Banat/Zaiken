"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAiReportRepository = void 0;
const crypto_1 = require("crypto");
const databaseProvider_1 = require("../../../main/ipc/databaseProvider");
class SqliteAiReportRepository {
    db() {
        return (0, databaseProvider_1.getDatabase)().getConnection();
    }
    getAll(limit = 50) {
        const n = Math.max(1, Math.min(500, Math.floor(limit) || 50));
        return this.db()
            .prepare(`
SELECT id, game_name AS gameName, title, content, provider, model, created_at AS createdAt
FROM ai_reports
ORDER BY created_at DESC
LIMIT ?
`)
            .all(n);
    }
    save(input) {
        const id = (0, crypto_1.randomUUID)();
        const createdAt = new Date().toISOString();
        const record = {
            id,
            gameName: input.gameName ?? null,
            title: input.title ?? null,
            content: String(input.content || ""),
            provider: input.provider ?? null,
            model: input.model ?? null,
            createdAt,
        };
        this.db()
            .prepare(`
INSERT INTO ai_reports (id, game_name, title, content, provider, model, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`)
            .run(record.id, record.gameName, record.title, record.content, record.provider, record.model, record.createdAt);
        return record;
    }
}
exports.SqliteAiReportRepository = SqliteAiReportRepository;
