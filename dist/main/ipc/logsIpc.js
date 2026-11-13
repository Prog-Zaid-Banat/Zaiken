"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: log integrity (hash / tail / watch) restricted to the log paths
// the user registered for games in the library (allowlist, not existsSync).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogsIpcHandlers = registerLogsIpcHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const repositoryProvider_1 = require("./repositoryProvider");
const SqliteLogHashRepository_1 = require("../../infrastructure/database/repositories/SqliteLogHashRepository");
const validationSchemas_1 = require("./validationSchemas");
const windowRegistry_1 = require("../windowRegistry");
const watchers = new Map();
const logHashRepository = new SqliteLogHashRepository_1.SqliteLogHashRepository();
async function registeredLogPath(logPath) {
    if (typeof logPath !== "string" || !logPath.trim())
        return null;
    const games = await (0, repositoryProvider_1.getGameRepository)().findAll();
    if (!(0, validationSchemas_1.isRegisteredLogPath)(logPath, games))
        return null;
    return logPath;
}
function sha256File(filePath) {
    const content = fs_1.default.readFileSync(filePath);
    const hash = crypto_1.default.createHash("sha256").update(content).digest("hex");
    return { hash, size: content.length };
}
function registerLogsIpcHandlers() {
    electron_1.ipcMain.handle("hash-log-file", async (event, logPath, gameId) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const allowed = await registeredLogPath(logPath);
        if (!allowed)
            return { ok: false, error: "Refused: path is not a registered game log" };
        if (!fs_1.default.existsSync(allowed))
            return { ok: false, error: "File not found" };
        try {
            const { hash, size } = sha256File(allowed);
            const gid = typeof gameId === "string" && gameId ? gameId : null;
            logHashRepository.saveLogHash({ gameId: gid, path: allowed, hash, size });
            return { ok: true, hash, size };
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to hash log" };
        }
    });
    electron_1.ipcMain.handle("verify-log-hash", async (event, logPath, expectedHash) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const allowed = await registeredLogPath(logPath);
        if (!allowed)
            return { ok: false, error: "Refused: path is not a registered game log" };
        if (!fs_1.default.existsSync(allowed))
            return { ok: false, error: "File not found" };
        if (typeof expectedHash !== "string" || !expectedHash) {
            return { ok: false, error: "Expected hash is required" };
        }
        try {
            const current = sha256File(allowed).hash;
            const valid = current === expectedHash;
            return { ok: valid, valid, error: valid ? undefined : "Hash mismatch" };
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to verify log" };
        }
    });
    electron_1.ipcMain.handle("read-log-tail", async (event, logPath, lines) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const allowed = await registeredLogPath(logPath);
        if (!allowed)
            return { ok: false, error: "Refused: path is not a registered game log" };
        if (!fs_1.default.existsSync(allowed))
            return { ok: false, error: "File not found" };
        try {
            const content = fs_1.default.readFileSync(allowed, "utf8");
            const allLines = content.split("\n").filter((l) => l.length > 0);
            const tail = allLines.slice(-(0, validationSchemas_1.clampLogLines)(lines));
            const hash = crypto_1.default.createHash("sha256").update(content).digest("hex");
            return { ok: true, lines: tail, totalLines: allLines.length, hash };
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to read log" };
        }
    });
    electron_1.ipcMain.handle("start-log-watch", async (event, logPath, gameId) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const allowed = await registeredLogPath(logPath);
        if (!allowed)
            return { ok: false, error: "Refused: path is not a registered game log" };
        if (!fs_1.default.existsSync(allowed))
            return { ok: false, error: "File not found" };
        if (watchers.has(allowed))
            return { ok: true, already: true };
        const gid = typeof gameId === "string" && gameId ? gameId : null;
        let lastHash = "";
        try {
            const watcher = fs_1.default.watch(allowed, { persistent: false }, () => {
                try {
                    const { hash, size } = sha256File(allowed);
                    if (hash !== lastHash) {
                        lastHash = hash;
                        logHashRepository.saveLogHash({ gameId: gid, path: allowed, hash, size });
                        const mainWin = (0, windowRegistry_1.getMainWindow)();
                        if (mainWin && !mainWin.isDestroyed()) {
                            mainWin.webContents.send("log-changed", { logPath: allowed, gameId: gid, hash });
                        }
                    }
                }
                catch {
                    // file may be locked while the game writes to it; skip this tick
                }
            });
            watchers.set(allowed, watcher);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to start log watch" };
        }
    });
    electron_1.ipcMain.handle("stop-log-watch", async (event, logPath) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        if (typeof logPath !== "string" || !logPath)
            return { ok: true };
        const w = watchers.get(logPath);
        if (w) {
            try {
                w.close();
            }
            catch {
                // ignore close errors
            }
            watchers.delete(logPath);
        }
        return { ok: true };
    });
    electron_1.ipcMain.handle("db-get-log-hashes", (event, gameId, limit) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        if (typeof gameId !== "string" || !gameId)
            return [];
        try {
            return logHashRepository.getByGame(gameId, typeof limit === "number" ? limit : 50);
        }
        catch {
            return [];
        }
    });
}
