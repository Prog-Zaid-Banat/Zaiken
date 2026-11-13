// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: per-game stats + daily stats for the profile/trend pages.

import { ipcMain } from "electron";
import { SqliteSessionRepository } from "../../infrastructure/database/repositories/SqliteSessionRepository";
import { getGameRepository } from "./repositoryProvider";
import { isTrustedSender } from "../windowRegistry";

export function registerStatsIpcHandlers() {
  const sessionRepository = new SqliteSessionRepository();

  ipcMain.handle("db-get-stats", async (event, gameId) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    if (typeof gameId !== "string" || !gameId.trim()) {
      return { success: false, error: "gameId is required" };
    }
    try {
      const game = await getGameRepository().findById(gameId);
      if (!game) return { success: false, error: "Game not found" };
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
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to read stats" };
    }
  });

  ipcMain.handle("db-get-daily-stats", async (event, days) => {
    if (!isTrustedSender(event)) return [];
    const n =
      typeof days === "number" && Number.isFinite(days) ? Math.floor(days) : 7;
    const count = Math.max(1, Math.min(90, n));
    try {
      return await sessionRepository.dailyStats(count);
    } catch {
      return [];
    }
  });
}
