"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2 + Phase 3: AI coach channels. The renderer must never hang on a
// missing handler, and the AI Coach must be genuinely functional: ai-ask /
// ai-daily-report / ai-daily-reports-batch are wired to the authenticated
// token bridge (callAiServerSafely), which reads credentials only in the main
// process and never exposes them to the renderer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiIpcHandlers = registerAiIpcHandlers;
const electron_1 = require("electron");
const SqliteAiReportRepository_1 = require("../../infrastructure/database/repositories/SqliteAiReportRepository");
const aiHealth_1 = require("../services/aiHealth");
const aiServiceBridge_1 = require("../services/aiServiceBridge");
const aiCredentials_1 = require("../services/aiCredentials");
const windowRegistry_1 = require("../windowRegistry");
const validationSchemas_1 = require("./validationSchemas");
const AI_SERVER = "http://127.0.0.1:8787";
const BATCH_GAP_MS = 2500;
const reportRepository = new SqliteAiReportRepository_1.SqliteAiReportRepository();
function needsSetupError() {
    return {
        ok: false,
        needsSetup: true,
        error: "AI Coach is not configured. Add an API key in Settings → AI Coach, and make sure the Zaiken AI server is running.",
    };
}
async function serverReady() {
    const health = await (0, aiHealth_1.probeAiHealth)(AI_SERVER);
    if (!health) {
        return { ok: false, needsSetup: true, error: "AI server is not running. Make sure the Zaiken AI server is running on port 8787." };
    }
    if (!health.hasKey) {
        return { ok: false, needsSetup: true, error: needsSetupError().error };
    }
    return { ok: true };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function mapReportData(gameName, raw) {
    const report = raw?.report;
    return {
        id: typeof report?.id === "string" ? report.id : null,
        game: typeof report?.game === "string" ? report.game : gameName,
        title: typeof report?.title === "string" ? report.title : `${gameName} Daily Report`,
        body: typeof report?.body === "string" ? report.body : "",
        createdAt: typeof report?.createdAt === "string" ? report.createdAt : new Date().toISOString(),
        model: typeof report?.model === "string" ? report.model : null,
        provider: typeof report?.provider === "string" ? report.provider : null,
    };
}
function registerAiIpcHandlers() {
    electron_1.ipcMain.handle("ai-status", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { configured: false };
        const health = await (0, aiHealth_1.probeAiHealth)(AI_SERVER);
        if (!health) {
            return { configured: false, provider: null, model: null, webSearch: false, appSecretConfigured: false, error: "AI server is not running" };
        }
        const appSecretConfigured = !!(await aiCredentials_1.aiCredentials.getAppSecret());
        return {
            configured: health.hasKey,
            provider: health.provider,
            model: health.model,
            webSearch: health.webSearch,
            appSecretConfigured,
        };
    });
    electron_1.ipcMain.handle("ai-ask", async (event, payload) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const parsed = (0, validationSchemas_1.parseAiAsk)(payload);
        if (!parsed.success)
            return { ok: false, error: "Invalid request payload" };
        const ready = await serverReady();
        if (!ready.ok)
            return ready;
        const result = await (0, aiServiceBridge_1.callAiServerSafely)("/v1/coach", {
            message: parsed.data.message,
            gameName: parsed.data.gameName ?? "general esports",
            stats: (0, validationSchemas_1.cleanStatsForAi)(parsed.data.stats),
        });
        if (!result.ok) {
            return {
                ok: false,
                needsSetup: result.needsSetup ?? false,
                error: result.error || "AI request failed",
            };
        }
        const reply = result.data?.reply;
        if (typeof reply !== "string" || !reply.trim()) {
            return { ok: false, error: "AI server returned an invalid response." };
        }
        return {
            ok: true,
            reply,
            model: result.data?.model ?? null,
            provider: result.data?.provider ?? null,
            usedWebSearch: result.data?.usedWebSearch === true,
        };
    });
    electron_1.ipcMain.handle("ai-daily-report", async (event, payload) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, error: "Unauthorized sender" };
        const parsed = (0, validationSchemas_1.parseAiDailyReport)(payload);
        if (!parsed.success)
            return { ok: false, error: "Invalid payload" };
        const ready = await serverReady();
        if (!ready.ok)
            return ready;
        const gameName = parsed.data.gameName ?? "Valorant";
        const result = await (0, aiServiceBridge_1.callAiServerSafely)("/v1/daily-report", { gameName });
        if (!result.ok) {
            return {
                ok: false,
                needsSetup: result.needsSetup ?? false,
                error: result.error || "AI daily report failed",
            };
        }
        const report = mapReportData(gameName, result.data);
        if (!report.body) {
            return { ok: false, error: "AI server returned an empty report." };
        }
        try {
            reportRepository.save({
                gameName: report.game,
                title: report.title,
                content: report.body,
                provider: report.provider,
                model: report.model,
            });
        }
        catch (error) {
            return { ok: false, error: error?.message || "Failed to save AI report" };
        }
        return { ok: true, report };
    });
    electron_1.ipcMain.handle("ai-daily-reports-batch", async (event, payload) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { ok: false, needsSetup: true, error: "Unauthorized sender" };
        const parsed = (0, validationSchemas_1.parseAiDailyReportsBatch)(payload);
        if (!parsed.success)
            return { ok: false, error: "Invalid games list" };
        const ready = await serverReady();
        if (!ready.ok)
            return ready;
        const games = parsed.data;
        const results = [];
        for (let i = 0; i < games.length; i++) {
            const game = games[i];
            if (i > 0)
                await sleep(BATCH_GAP_MS);
            const result = await (0, aiServiceBridge_1.callAiServerSafely)("/v1/daily-report", { gameName: game });
            if (!result.ok) {
                if (result.needsSetup) {
                    return { ok: false, needsSetup: true, error: result.error || "AI request failed" };
                }
                results.push({ game, ok: false, error: result.error || "AI daily report failed" });
                continue;
            }
            const report = mapReportData(game, result.data);
            if (!report.body) {
                results.push({ game, ok: false, error: "AI server returned an empty report." });
                continue;
            }
            try {
                reportRepository.save({
                    gameName: report.game,
                    title: report.title,
                    content: report.body,
                    provider: report.provider,
                    model: report.model,
                });
            }
            catch (error) {
                results.push({ game, ok: false, error: error?.message || "Failed to save AI report" });
                continue;
            }
            results.push({ game, ok: true, report });
        }
        return { ok: true, results };
    });
    electron_1.ipcMain.handle("db-get-ai-reports", (event, limit) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        try {
            return reportRepository.getAll(typeof limit === "number" ? limit : 50);
        }
        catch {
            return [];
        }
    });
    electron_1.ipcMain.handle("db-save-ai-report", (event, report) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        if (!report || typeof report !== "object")
            return { success: false, error: "Invalid report" };
        if (typeof report.content !== "string" || !report.content.trim()) {
            return { success: false, error: "Report content is required" };
        }
        try {
            const saved = reportRepository.save({
                gameName: typeof report.gameName === "string" ? report.gameName : null,
                title: typeof report.title === "string" ? report.title : null,
                content: report.content,
                provider: typeof report.provider === "string" ? report.provider : null,
                model: typeof report.model === "string" ? report.model : null,
            });
            return { success: true, data: saved };
        }
        catch (error) {
            return { success: false, error: error?.message || "Failed to save report" };
        }
    });
}
