// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: shared IPC input validation + pure helper logic.
// No electron imports here so these can be unit-tested under plain Node.

import path from "path";
import { z } from "zod";

// ---- Session payloads ----

export const sessionStartSchema = z.object({
  gameId: z.string().min(1).max(200),
  exeName: z.string().max(300).optional().nullable(),
});

export const sessionEndSchema = z.object({
  gameId: z.string().min(1).max(200),
  startedAt: z.number().optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
});

export const recordMatchSchema = z.object({
  kills: z.number().min(0).max(1000000).optional().default(0),
  deaths: z.number().min(0).max(1000000).optional().default(0),
  wins: z.number().min(0).max(1000000).optional().default(0),
  losses: z.number().min(0).max(1000000).optional().default(0),
  matches: z.number().min(0).max(1000000).optional().default(1),
});

export function parseSessionStart(payload: unknown) {
  return sessionStartSchema.safeParse(payload);
}

export function parseSessionEnd(payload: unknown) {
  return sessionEndSchema.safeParse(payload);
}


// ---- Game library payloads ----

const optionalText = z.string().trim().max(2000).nullable().optional();
const optionalCount = z.number().finite().int().min(0).max(1_000_000).optional();

export const gameCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  genre: z.string().trim().max(200).optional(),
  exePath: optionalText,
  coverImage: optionalText,
  emoji: z.string().trim().min(1).max(16).optional(),
  platform: z.string().trim().min(1).max(100).optional(),
  steamAppId: z.string().trim().max(200).nullable().optional(),
  logPath: optionalText,
  notes: optionalText,
});

export const gameUpdateSchema = gameCreateSchema
  .omit({ name: true })
  .extend({ name: z.string().trim().min(1).max(200).optional() })
  .extend({
    totalMinutes: optionalCount,
    kills: optionalCount,
    deaths: optionalCount,
    wins: optionalCount,
    losses: optionalCount,
    matches: optionalCount,
    lastPlayedAt: z.string().datetime().nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Game update must include at least one field",
  });

export function parseGameId(id: unknown) {
  return z.string().trim().min(1).max(200).safeParse(id);
}// ---- Session minutes ----

export function computeSessionMinutes(
  startedAt?: number | null,
  now: number = Date.now()
): number {
  const start =
    typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0
      ? startedAt
      : 0;
  if (start <= 0) return 1;
  const minutes = Math.round((now - start) / 60000);
  return Math.max(1, minutes);
}

// ---- Allowlist helpers (launch-game / log access) ----

function normalizePath(p: string): string {
  let n = path.normalize(String(p)).replace(/[\\/]+/g, path.sep);
  if (process.platform === "win32") n = n.toLowerCase();
  return n;
}

export interface AllowlistEntry {
  exePath?: string | null;
  logPath?: string | null;
}

// The renderer may only launch an executable that exists in the registered
// game library (exact, case-normalized path match). Existence on disk is NOT
// the security boundary — membership in the allowlist is.
export function isRegisteredExePath(
  exePath: unknown,
  games: ReadonlyArray<AllowlistEntry>
): boolean {
  if (typeof exePath !== "string" || !exePath.trim()) return false;
  const needle = normalizePath(exePath);
  return games.some(
    (g) =>
      typeof g?.exePath === "string" &&
      g.exePath.length > 0 &&
      normalizePath(g.exePath) === needle
  );
}

// Log read/hash/watch operations are only allowed against the log path the
// user registered for a game in the library.
export function isRegisteredLogPath(
  logPath: unknown,
  games: ReadonlyArray<AllowlistEntry>
): boolean {
  if (typeof logPath !== "string" || !logPath.trim()) return false;
  const needle = normalizePath(logPath);
  return games.some(
    (g) =>
      typeof g?.logPath === "string" &&
      g.logPath.length > 0 &&
      normalizePath(g.logPath) === needle
  );
}

export function isRegisteredFolder(
  folder: unknown,
  games: ReadonlyArray<AllowlistEntry>
): boolean {
  if (typeof folder !== "string" || !folder.trim()) return false;
  const needle = normalizePath(folder);
  return games.some((g) => {
    if (typeof g?.exePath === "string" && g.exePath.length > 0) {
      if (normalizePath(path.dirname(g.exePath)) === needle) return true;
    }
    if (typeof g?.logPath === "string" && g.logPath.length > 0) {
      if (normalizePath(path.dirname(g.logPath)) === needle) return true;
    }
    return false;
  });
}

// External navigation must be explicit https URLs only.
export function isSafeHttpUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Clamp the number of log lines requested by the renderer.
export function clampLogLines(lines: unknown): number {
  const n = typeof lines === "number" && Number.isFinite(lines) ? Math.floor(lines) : 100;
  return Math.max(1, Math.min(2000, n));
}

// ---- AI request payloads (Phase 3) ----

export const aiAskSchema = z.object({
  message: z.string().min(1).max(4000),
  gameName: z.string().min(1).max(200).optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
  history: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
});

export const aiDailyReportSchema = z.object({
  gameName: z.string().min(1).max(200).optional(),
});

export const aiDailyReportsBatchSchema = z
  .array(z.string().min(1).max(200))
  .min(1)
  .max(5);

export function parseAiAsk(payload: unknown) {
  return aiAskSchema.safeParse(payload);
}

export function parseAiDailyReport(payload: unknown) {
  return aiDailyReportSchema.safeParse(payload);
}

export function parseAiDailyReportsBatch(payload: unknown) {
  return aiDailyReportsBatchSchema.safeParse(payload);
}

export function cleanStatsForAi(stats: Record<string, unknown> | undefined): Record<string, unknown> {
  const s = stats && typeof stats === "object" ? stats : {};
  const pick = (a: string, b: string) => {
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
