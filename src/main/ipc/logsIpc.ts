// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: log integrity (hash / tail / watch) restricted to the log paths
// the user registered for games in the library (allowlist, not existsSync).

import { ipcMain } from "electron";
import fs from "fs";
import crypto from "crypto";
import { getGameRepository } from "./repositoryProvider";
import { SqliteLogHashRepository } from "../../infrastructure/database/repositories/SqliteLogHashRepository";
import { isRegisteredLogPath, clampLogLines } from "./validationSchemas";
import { getMainWindow, isTrustedSender } from "../windowRegistry";

const watchers = new Map<string, fs.FSWatcher>();
const logHashRepository = new SqliteLogHashRepository();

async function registeredLogPath(logPath: unknown): Promise<string | null> {
  if (typeof logPath !== "string" || !logPath.trim()) return null;
  const games = await getGameRepository().findAll();
  if (!isRegisteredLogPath(logPath, games)) return null;
  return logPath;
}

function sha256File(filePath: string): { hash: string; size: number } {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return { hash, size: content.length };
}

export function registerLogsIpcHandlers() {
  ipcMain.handle("hash-log-file", async (event, logPath, gameId) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const allowed = await registeredLogPath(logPath);
    if (!allowed) return { ok: false, error: "Refused: path is not a registered game log" };
    if (!fs.existsSync(allowed)) return { ok: false, error: "File not found" };
    try {
      const { hash, size } = sha256File(allowed);
      const gid = typeof gameId === "string" && gameId ? gameId : null;
      logHashRepository.saveLogHash({ gameId: gid, path: allowed, hash, size });
      return { ok: true, hash, size };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Failed to hash log" };
    }
  });

  ipcMain.handle("verify-log-hash", async (event, logPath, expectedHash) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const allowed = await registeredLogPath(logPath);
    if (!allowed) return { ok: false, error: "Refused: path is not a registered game log" };
    if (!fs.existsSync(allowed)) return { ok: false, error: "File not found" };
    if (typeof expectedHash !== "string" || !expectedHash) {
      return { ok: false, error: "Expected hash is required" };
    }
    try {
      const current = sha256File(allowed).hash;
      const valid = current === expectedHash;
      return { ok: valid, valid, error: valid ? undefined : "Hash mismatch" };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Failed to verify log" };
    }
  });

  ipcMain.handle("read-log-tail", async (event, logPath, lines) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const allowed = await registeredLogPath(logPath);
    if (!allowed) return { ok: false, error: "Refused: path is not a registered game log" };
    if (!fs.existsSync(allowed)) return { ok: false, error: "File not found" };
    try {
      const content = fs.readFileSync(allowed, "utf8");
      const allLines = content.split("\n").filter((l) => l.length > 0);
      const tail = allLines.slice(-clampLogLines(lines));
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      return { ok: true, lines: tail, totalLines: allLines.length, hash };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Failed to read log" };
    }
  });

  ipcMain.handle("start-log-watch", async (event, logPath, gameId) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    const allowed = await registeredLogPath(logPath);
    if (!allowed) return { ok: false, error: "Refused: path is not a registered game log" };
    if (!fs.existsSync(allowed)) return { ok: false, error: "File not found" };
    if (watchers.has(allowed)) return { ok: true, already: true };

    const gid = typeof gameId === "string" && gameId ? gameId : null;
    let lastHash = "";
    try {
      const watcher = fs.watch(allowed, { persistent: false }, () => {
        try {
          const { hash, size } = sha256File(allowed);
          if (hash !== lastHash) {
            lastHash = hash;
            logHashRepository.saveLogHash({ gameId: gid, path: allowed, hash, size });
            const mainWin = getMainWindow();
            if (mainWin && !mainWin.isDestroyed()) {
              mainWin.webContents.send("log-changed", { logPath: allowed, gameId: gid, hash });
            }
          }
        } catch {
          // file may be locked while the game writes to it; skip this tick
        }
      });
      watchers.set(allowed, watcher);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Failed to start log watch" };
    }
  });

  ipcMain.handle("stop-log-watch", async (event, logPath) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    if (typeof logPath !== "string" || !logPath) return { ok: true };
    const w = watchers.get(logPath);
    if (w) {
      try {
        w.close();
      } catch {
        // ignore close errors
      }
      watchers.delete(logPath);
    }
    return { ok: true };
  });

  ipcMain.handle("db-get-log-hashes", (event, gameId, limit) => {
    if (!isTrustedSender(event)) return [];
    if (typeof gameId !== "string" || !gameId) return [];
    try {
      return logHashRepository.getByGame(gameId, typeof limit === "number" ? limit : 50);
    } catch {
      return [];
    }
  });
}
