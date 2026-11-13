"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: per-game stats + daily stats for the profile/trend pages.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStatsIpcHandlers = registerStatsIpcHandlers;
const electron_1 = require("electron");
const SqliteSessionRepository_1 = require("../../infrastructure/database/repositories/SqliteSessionRepository");
const repositoryProvider_1 = require("./repositoryProvider");
const windowRegistry_1 = require("../windowRegistry");
function registerStatsIpcHandlers() {
    const sessionRepository = new SqliteSessionRepository_1.SqliteSessionRepository();
    electron_1.ipcMain.handle("db-get-stats", async (event, gameId) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        if (typeof gameId !== "string" || !gameId.trim()) {
            return { success: false, error: "gameId is required" };
        }
        try {
            const game = await (0, repositoryProvider_1.getGameRepository)().findById(gameId);
            if (!game)
                return { success: false, error: "Game not found" };
            return {
                success: true,
                data: {
                    gameId: game.id,
                    name: game.name,
                    totalMinutes: game.totalMinutes,
                    kills: game.kills,
                    deaths: game.deaths,
                    wins: game.wins,
                    losses: game.losses,
                    matches: game.matches,
                    lastPlayedAt: game.lastPlayedAt ?? null,
                },
            };
        }
        catch (error) {
            return { success: false, error: error?.message || "Failed to read stats" };
        }
    });
    electron_1.ipcMain.handle("db-get-daily-stats", async (event, days) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        const n = typeof days === "number" && Number.isFinite(days) ? Math.floor(days) : 7;
        const count = Math.max(1, Math.min(90, n));
        try {
            return await sessionRepository.dailyStats(count);
        }
        catch {
            return [];
        }
    });
}
