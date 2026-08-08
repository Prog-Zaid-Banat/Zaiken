"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class MigrationRunner {
    db;
    constructor(db) {
        this.db = db;
    }
    run() {
        this.createMigrationTable();
        const migrationsPath = path_1.default.join(__dirname, "migrations");
        if (!fs_1.default.existsSync(migrationsPath)) {
            throw new Error(`Migrations folder not found: ${migrationsPath}`);
        }
        const files = fs_1.default
            .readdirSync(migrationsPath)
            .filter(file => file.endsWith(".sql"))
            .sort();
        for (const file of files) {
            const exists = this.db
                .prepare(`
                    SELECT 1
                    FROM schema_migrations
                    WHERE name = ?
                    `)
                .get(file);
            if (exists) {
                continue;
            }
            const filePath = path_1.default.join(migrationsPath, file);
            const sql = fs_1.default.readFileSync(filePath, "utf8");
            const execute = this.db.transaction(() => {
                this.db.exec(sql);
                this.db
                    .prepare(`
                        INSERT INTO schema_migrations
                        (
                            name,
                            applied_at
                        )
                        VALUES (?,?)
                        `)
                    .run(file, new Date().toISOString());
            });
            execute();
            console.log(`[Migration] Applied ${file}`);
        }
    }
    createMigrationTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS schema_migrations(

                name TEXT PRIMARY KEY NOT NULL,

                applied_at TEXT NOT NULL

            );
            `);
    }
}
exports.MigrationRunner = MigrationRunner;
