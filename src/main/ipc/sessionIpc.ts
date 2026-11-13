// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: in-memory active play session + persistence on end.

import { ipcMain } from "electron";
import { SqliteSessionRepository } from "../../infrastructure/database/repositories/SqliteSessionRepository";
import { SqliteAchievementsRepository } from "../../infrastructure/database/repositories/SqliteAchievementsRepository";
import {
  computeSessionMinutes,
  parseSessionStart,
  parseSessionEnd,
} from "./validationSchemas";
import { isTrustedSender } from "../windowRegistry";

interface ActiveSession {
  gameId: string;
  exeName: string | null;
  startedAt: number;
}

let activeSession: ActiveSession | null = null;

export function getActiveSession(): ActiveSession | null {
  return activeSession ? { ...activeSession } : null;
}

export function registerSessionIpcHandlers() {
  const sessionRepository = new SqliteSessionRepository();

  ipcMain.handle("session-start", (event, payload) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const parsed = parseSessionStart(payload);
    if (!parsed.success) return { ok: false, error: "Invalid session payload" };

    activeSession = {
      gameId: parsed.data.gameId,
      exeName: parsed.data.exeName ?? null,
      startedAt: Date.now(),
    };
    return { ok: true, session: { ...activeSession } };
  });

  ipcMain.handle("session-get", (event) => {
    if (!isTrustedSender(event)) return null;
    return getActiveSession();
  });

  ipcMain.handle("session-end", async (event, payload) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const parsed = parseSessionEnd(payload);
    if (!parsed.success) return { ok: false, error: "Invalid session payload" };

    const fallback = activeSession;
    const gameId = parsed.data.gameId || fallback?.gameId || null;
    const startedAt = parsed.data.startedAt ?? fallback?.startedAt ?? 0;

    activeSession = null;

    if (!gameId) return { ok: false, error: "Missing gameId" };

    const minutes = computeSessionMinutes(startedAt);
    const stats = parsed.data.stats && typeof parsed.data.stats === "object" ? parsed.data.stats : {};

    try {
      await sessionRepository.add({
        gameId,
        minutes,
        kills: Number(stats.kills) || 0,
        deaths: Number(stats.deaths) || 0,
        wins: Number(stats.wins) || 0,
        losses: Number(stats.losses) || 0,
        matches: Number(stats.matches) || 0,
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        endedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      return { ok: false, error: error?.message || "Failed to save session" };
    }

    let unlocked: unknown[] = [];
    try {
      unlocked = new SqliteAchievementsRepository().evaluate();
    } catch {
      unlocked = [];
    }

    return { ok: true, minutes, unlocked };
  });
}
