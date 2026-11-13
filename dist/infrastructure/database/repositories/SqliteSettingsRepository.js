"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSettingsRepository = void 0;
const databaseProvider_1 = require("../../../main/ipc/databaseProvider");
const DEFAULT_SETTINGS = {
    overlayEnabled: false,
    accentColor: "#00FFB2"
};
class SqliteSettingsRepository {
    db() {
        return (0, databaseProvider_1.getDatabase)()
            .getConnection();
    }
    getAll() {
        const rows = this.db()
            .prepare(`
SELECT

key,

value_json AS valueJson

FROM settings
`)
            .all();
        const result = { ...DEFAULT_SETTINGS };
        for (const row of rows) {
            try {
                result[row.key] =
                    JSON.parse(row.valueJson);
            }
            catch {
                result[row.key] =
                    row.valueJson;
            }
        }
        return result;
    }
    save(input) {
        if (!input ||
            typeof input !== "object" ||
            Array.isArray(input)) {
            throw new Error("Settings must be an object.");
        }
        const upsert = this.db()
            .prepare(`
INSERT INTO settings
(key, value_json, updated_at)

VALUES (?, ?, datetime('now'))

ON CONFLICT(key) DO UPDATE SET
value_json = excluded.value_json,
updated_at = excluded.updated_at
`);
        const runAll = this.db()
            .transaction((entries) => {
            for (const [key, value] of entries) {
                upsert.run(key, JSON.stringify(value));
            }
        });
        runAll(Object.entries(input));
        return this.getAll();
    }
    resetAllData() {
        this.db()
            .prepare("DELETE FROM settings")
            .run();
    }
    deleteKeys(keys) {
        const list = (Array.isArray(keys) ? keys : [])
            .filter((key) => typeof key === "string" &&
            key.trim().length > 0)
            .map((key) => key.trim());
        if (!list.length) {
            return;
        }
        const stmt = this.db()
            .prepare("DELETE FROM settings WHERE key = ?");
        const runAll = this.db()
            .transaction((entries) => {
            for (const key of entries) {
                stmt.run(key);
            }
        });
        runAll(list);
    }
}
exports.SqliteSettingsRepository = SqliteSettingsRepository;
