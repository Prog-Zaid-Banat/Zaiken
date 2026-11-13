"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGameIpcHandlers = registerGameIpcHandlers;
const electron_1 = require("electron");
const repositoryProvider_1 = require("./repositoryProvider");
const SqliteSessionRepository_1 = require("../../infrastructure/database/repositories/SqliteSessionRepository");
const windowRegistry_1 = require("../windowRegistry");
const validationSchemas_1 = require("./validationSchemas");
const sessionRepository = new SqliteSessionRepository_1.SqliteSessionRepository();
function registerGameIpcHandlers() {
    electron_1.ipcMain.handle("zaiken:games:get-all", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        try {
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            const games = await gameRepository.findAll();
            return {
                success: true,
                data: games
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to fetch games:", error);
            return {
                success: false,
                error: error.message ||
                    "Unknown database error"
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:save", async (event, gameData) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        try {
            const parsed = validationSchemas_1.gameCreateSchema.safeParse(gameData);
            if (!parsed.success) {
                return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid game data" };
            }
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            const saved = await gameRepository.add(parsed.data);
            return {
                success: true,
                data: saved
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to save game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:update", async (event, id, patch) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        try {
            const parsedId = (0, validationSchemas_1.parseGameId)(id);
            const parsedPatch = validationSchemas_1.gameUpdateSchema.safeParse(patch);
            if (!parsedId.success) {
                return { success: false, error: parsedId.error.issues[0]?.message ?? "Invalid game ID" };
            }
            if (!parsedPatch.success) {
                return { success: false, error: parsedPatch.error.issues[0]?.message ?? "Invalid game update" };
            }
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            const updated = await gameRepository.update(parsedId.data, parsedPatch.data);
            if (!updated) {
                return {
                    success: false,
                    error: "Game not found"
                };
            }
            return {
                success: true,
                data: updated
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to update game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:delete", async (event, gameId) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        try {
            const parsedId = (0, validationSchemas_1.parseGameId)(gameId);
            if (!parsedId.success) {
                return { success: false, error: parsedId.error.issues[0]?.message ?? "Invalid game ID" };
            }
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            await gameRepository.delete(parsedId.data);
            return {
                success: true
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to delete game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("db-add-session", async (event, gameId, minutes, stats) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        if (typeof gameId !== "string" || !gameId.trim()) {
            return { success: false, error: "gameId is required" };
        }
        const m = Math.max(0, Math.round(Number(minutes) || 0));
        const s = stats && typeof stats === "object"
            ? stats
            : {};
        try {
            const startedAt = new Date(Date.now() - m * 60_000).toISOString();
            await sessionRepository.add({
                gameId,
                minutes: m,
                kills: Number(s.kills) || 0,
                deaths: Number(s.deaths) || 0,
                wins: Number(s.wins) || 0,
                losses: Number(s.losses) || 0,
                matches: Number(s.matches) || 0,
                startedAt,
                endedAt: new Date().toISOString()
            });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error?.message ||
                    "Failed to add session"
            };
        }
    });
}
