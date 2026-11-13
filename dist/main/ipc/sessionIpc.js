"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: in-memory active play session + persistence on end.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveSession = getActiveSession;
exports.registerSessionIpcHandlers = registerSessionIpcHandlers;
const electron_1 = require("electron");
const SqliteSessionRepository_1 = require("../../infrastructure/database/repositories/SqliteSessionRepository");
const SqliteAchievementsRepository_1 = require("../../infrastructure/database/repositories/SqliteAchievementsRepository");
const validationSchemas_1 = require("./validationSchemas");
const windowRegistry_1 = require("../windowRegistry");
let activeSession = null;
function getActiveSession() {
    return activeSession ? { ...activeSession } : null;
}
function registerSessionIpcHandlers() {
    const sessionRepository = new SqliteSessionRepository_1.SqliteSessionRepository();
    electron_1.ipcMain.handle("session-start", (event, payload) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const parsed = (0, validationSchemas_1.parseSessionStart)(payload);
        if (!parsed.success)
            return { ok: false, error: "Invalid session payload" };
        activeSession = {
            gameId: parsed.data.gameId,
            exeName: parsed.data.exeName ?? null,
            startedAt: Date.now(),
        };
        return { ok: true, session: { ...activeSession } };
    });
    electron_1.ipcMain.handle("session-get", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        return getActiveSession();
    });
    electron_1.ipcMain.handle("session-end", async (event, payload) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const parsed = (0, validationSchemas_1.parseSessionEnd)(payload);
        if (!parsed.success)
            return { ok: false, error: "Invalid session payload" };
        const fallback = activeSession;
        const gameId = parsed.data.gameId || fallback?.gameId || null;
        const startedAt = parsed.data.startedAt ?? fallback?.startedAt ?? 0;
        activeSession = null;
        if (!gameId)
            return { ok: false, error: "Missing gameId" };
        const minutes = (0, validationSchemas_1.computeSessionMinutes)(startedAt);
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
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to save session" };
        }
        let unlocked = [];
        try {
            unlocked = new SqliteAchievementsRepository_1.SqliteAchievementsRepository().evaluate();
        }
        catch {
            unlocked = [];
        }
        return { ok: true, minutes, unlocked };
    });
}
