"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class DatabaseConnection {
    connection;
    initialize(path) {
        this.connection = new better_sqlite3_1.default(path);
        this.connection.pragma("journal_mode=WAL");
        this.connection.pragma("foreign_keys=ON");
    }
    getConnection() {
        return this.connection;
    }
    close() {
        if (this.connection) {
            this.connection.close();
        }
    }
}
exports.DatabaseConnection = DatabaseConnection;
