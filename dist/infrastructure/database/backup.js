"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackup = createBackup;
exports.listBackups = listBackups;
/**
 * Database backup + restore helpers
 * Copyright © 2026 Zaid Bilal Banat
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("./client");
const Logger_1 = require("../logging/Logger");
const log = (0, Logger_1.createLogger)('database');
function createBackup(dbPath, backupRoot) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path_1.default.join(backupRoot, `backup_${stamp}`);
    fs_1.default.mkdirSync(dir, { recursive: true });
    // checkpoint WAL so main file is consistent
    try {
        (0, client_1.getSqlite)().pragma('wal_checkpoint(TRUNCATE)');
    }
    catch {
        /* db may not be open in some tooling contexts */
    }
    const base = path_1.default.basename(dbPath);
    fs_1.default.copyFileSync(dbPath, path_1.default.join(dir, base));
    for (const suffix of ['-wal', '-shm']) {
        const p = dbPath + suffix;
        if (fs_1.default.existsSync(p))
            fs_1.default.copyFileSync(p, path_1.default.join(dir, base + suffix));
    }
    log.info({ dir }, 'backup created');
    return dir;
}
function listBackups(backupRoot) {
    if (!fs_1.default.existsSync(backupRoot))
        return [];
    return fs_1.default
        .readdirSync(backupRoot)
        .filter((n) => n.startsWith('backup_'))
        .sort()
        .reverse()
        .map((n) => path_1.default.join(backupRoot, n));
}
