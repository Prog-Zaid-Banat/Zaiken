"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeInitializer = void 0;
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const DatabaseConnection_1 = require("../../infrastructure/database/DatabaseConnection");
const MigrationRunner_1 = require("../../infrastructure/database/MigrationRunner");
const SqliteGameRepository_1 = require("../../infrastructure/database/repositories/SqliteGameRepository");
const databaseProvider_1 = require("../ipc/databaseProvider");
const client_1 = require("../../infrastructure/database/client");
const repositoryProvider_1 = require("../ipc/repositoryProvider");
class RuntimeInitializer {
    database;
    constructor() {
        this.database = new DatabaseConnection_1.DatabaseConnection();
    }
    async initialize() {
        await this.initializeDatabase();
        console.log("[Zaiken] Runtime initialized successfully");
    }
    async initializeDatabase() {
        const databasePath = path_1.default.join(electron_1.app.getPath("userData"), "zaiken.db");
        console.log("[Zaiken] DATABASE LOCATION:", databasePath);
        // 0. Initialize drizzle-based client
        (0, client_1.initDatabase)(databasePath);
        // 1. Create database connection
        this.database.initialize(databasePath);
        console.log("[Zaiken] Database connection created");
        // 2. Run database migrations
        const migrationRunner = new MigrationRunner_1.MigrationRunner(this.database.getConnection());
        migrationRunner.run();
        console.log("[Zaiken] Database migrations completed");
        // 3. Register database instance
        (0, databaseProvider_1.setDatabase)(this.database);
        console.log("[Zaiken] DATABASE READY");
        console.log("[Zaiken] Database provider registered");
        // 4. Register repositories
        const gameRepository = new SqliteGameRepository_1.SqliteGameRepository();
        (0, repositoryProvider_1.setGameRepository)(gameRepository);
        console.log("[Zaiken] Game repository registered");
        console.log(`[Zaiken] Database path: ${databasePath}`);
    }
    shutdown() {
        this.database.close();
        console.log("[Zaiken] Runtime shutdown completed");
    }
}
exports.RuntimeInitializer = RuntimeInitializer;
