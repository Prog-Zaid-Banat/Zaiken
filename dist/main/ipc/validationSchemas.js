"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: shared IPC input validation + pure helper logic.
// No electron imports here so these can be unit-tested under plain Node.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiDailyReportsBatchSchema = exports.aiDailyReportSchema = exports.aiAskSchema = exports.gameUpdateSchema = exports.gameCreateSchema = exports.recordMatchSchema = exports.sessionEndSchema = exports.sessionStartSchema = void 0;
exports.parseSessionStart = parseSessionStart;
exports.parseSessionEnd = parseSessionEnd;
exports.parseGameId = parseGameId;
exports.computeSessionMinutes = computeSessionMinutes;
exports.isRegisteredExePath = isRegisteredExePath;
exports.isRegisteredLogPath = isRegisteredLogPath;
exports.isRegisteredFolder = isRegisteredFolder;
exports.isSafeHttpUrl = isSafeHttpUrl;
exports.clampLogLines = clampLogLines;
exports.parseAiAsk = parseAiAsk;
exports.parseAiDailyReport = parseAiDailyReport;
exports.parseAiDailyReportsBatch = parseAiDailyReportsBatch;
exports.cleanStatsForAi = cleanStatsForAi;
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// ---- Session payloads ----
exports.sessionStartSchema = zod_1.z.object({
    gameId: zod_1.z.string().min(1).max(200),
    exeName: zod_1.z.string().max(300).optional().nullable(),
});
exports.sessionEndSchema = zod_1.z.object({
    gameId: zod_1.z.string().min(1).max(200),
    startedAt: zod_1.z.number().optional(),
    stats: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.recordMatchSchema = zod_1.z.object({
    kills: zod_1.z.number().min(0).max(1000000).optional().default(0),
    deaths: zod_1.z.number().min(0).max(1000000).optional().default(0),
    wins: zod_1.z.number().min(0).max(1000000).optional().default(0),
    losses: zod_1.z.number().min(0).max(1000000).optional().default(0),
    matches: zod_1.z.number().min(0).max(1000000).optional().default(1),
});
function parseSessionStart(payload) {
    return exports.sessionStartSchema.safeParse(payload);
}
function parseSessionEnd(payload) {
    return exports.sessionEndSchema.safeParse(payload);
}
// ---- Game library payloads ----
const optionalText = zod_1.z.string().trim().max(2000).nullable().optional();
const optionalCount = zod_1.z.number().finite().int().min(0).max(1_000_000).optional();
exports.gameCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(200),
    genre: zod_1.z.string().trim().max(200).optional(),
    exePath: optionalText,
    coverImage: optionalText,
    emoji: zod_1.z.string().trim().min(1).max(16).optional(),
    platform: zod_1.z.string().trim().min(1).max(100).optional(),
    steamAppId: zod_1.z.string().trim().max(200).nullable().optional(),
    logPath: optionalText,
    notes: optionalText,
});
exports.gameUpdateSchema = exports.gameCreateSchema
    .omit({ name: true })
    .extend({ name: zod_1.z.string().trim().min(1).max(200).optional() })
    .extend({
    totalMinutes: optionalCount,
    kills: optionalCount,
    deaths: optionalCount,
    wins: optionalCount,
    losses: optionalCount,
    matches: optionalCount,
    lastPlayedAt: zod_1.z.string().datetime().nullable().optional(),
})
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "Game update must include at least one field",
});
function parseGameId(id) {
    return zod_1.z.string().trim().min(1).max(200).safeParse(id);
} // ---- Session minutes ----
function computeSessionMinutes(startedAt, now = Date.now()) {
    const start = typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0
        ? startedAt
        : 0;
    if (start <= 0)
        return 1;
    const minutes = Math.round((now - start) / 60000);
    return Math.max(1, minutes);
}
// ---- Allowlist helpers (launch-game / log access) ----
function normalizePath(p) {
    let n = path_1.default.normalize(String(p)).replace(/[\\/]+/g, path_1.default.sep);
    if (process.platform === "win32")
        n = n.toLowerCase();
    return n;
}
// The renderer may only launch an executable that exists in the registered
// game library (exact, case-normalized path match). Existence on disk is NOT
// the security boundary — membership in the allowlist is.
function isRegisteredExePath(exePath, games) {
    if (typeof exePath !== "string" || !exePath.trim())
        return false;
    const needle = normalizePath(exePath);
    return games.some((g) => typeof g?.exePath === "string" &&
        g.exePath.length > 0 &&
        normalizePath(g.exePath) === needle);
}
// Log read/hash/watch operations are only allowed against the log path the
// user registered for a game in the library.
function isRegisteredLogPath(logPath, games) {
    if (typeof logPath !== "string" || !logPath.trim())
        return false;
    const needle = normalizePath(logPath);
    return games.some((g) => typeof g?.logPath === "string" &&
        g.logPath.length > 0 &&
        normalizePath(g.logPath) === needle);
}
function isRegisteredFolder(folder, games) {
    if (typeof folder !== "string" || !folder.trim())
        return false;
    const needle = normalizePath(folder);
    return games.some((g) => {
        if (typeof g?.exePath === "string" && g.exePath.length > 0) {
            if (normalizePath(path_1.default.dirname(g.exePath)) === needle)
                return true;
        }
        if (typeof g?.logPath === "string" && g.logPath.length > 0) {
            if (normalizePath(path_1.default.dirname(g.logPath)) === needle)
                return true;
        }
        return false;
    });
}
// External navigation must be explicit https URLs only.
function isSafeHttpUrl(url) {
    if (typeof url !== "string" || !url.trim())
        return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
// Clamp the number of log lines requested by the renderer.
function clampLogLines(lines) {
    const n = typeof lines === "number" && Number.isFinite(lines) ? Math.floor(lines) : 100;
    return Math.max(1, Math.min(2000, n));
}
// ---- AI request payloads (Phase 3) ----
exports.aiAskSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(4000),
    gameName: zod_1.z.string().min(1).max(200).optional(),
    stats: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    history: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).max(20).optional(),
});
exports.aiDailyReportSchema = zod_1.z.object({
    gameName: zod_1.z.string().min(1).max(200).optional(),
});
exports.aiDailyReportsBatchSchema = zod_1.z
    .array(zod_1.z.string().min(1).max(200))
    .min(1)
    .max(5);
function parseAiAsk(payload) {
    return exports.aiAskSchema.safeParse(payload);
}
function parseAiDailyReport(payload) {
    return exports.aiDailyReportSchema.safeParse(payload);
}
function parseAiDailyReportsBatch(payload) {
    return exports.aiDailyReportsBatchSchema.safeParse(payload);
}
function cleanStatsForAi(stats) {
    const s = stats && typeof stats === "object" ? stats : {};
    const pick = (a, b) => {
        const v = s[a] ?? s[b];
        return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
    };
    return {
        totalKills: pick("totalKills", "kills"),
        totalDeaths: pick("totalDeaths", "deaths"),
        totalWins: pick("totalWins", "wins"),
        totalMatches: pick("totalMatches", "matches"),
        rank: typeof s.rank === "string" ? s.rank.slice(0, 40) : null,
        level: typeof s.level === "number" ? s.level : null,
    };
}
