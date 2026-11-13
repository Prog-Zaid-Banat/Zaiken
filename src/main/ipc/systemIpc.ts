// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: system-level IPC. launch-game only launches executables that exist
// in Zaiken's registered game library (allowlist). Renderer-supplied paths
// are never trusted by themselves.

import { app, dialog, ipcMain, powerSaveBlocker, shell } from "electron";
import { getGameRepository } from "./repositoryProvider";
import { SystemStatsService } from "../services/SystemStatsService";
import {
  isRegisteredExePath,
  isRegisteredFolder,
  isSafeHttpUrl,
} from "./validationSchemas";
import { isTrustedSender, sendToOverlay } from "../windowRegistry";

let powerBlockerId: number | null = null;

const ALLOWED_PATH_NAMES = new Set([
  "userData",
  "appData",
  "home",
  "temp",
  "cache",
  "logs",
  "documents",
  "downloads",
  "music",
  "pictures",
  "videos",
  "desktop",
]);

export function registerSystemIpcHandlers() {
  ipcMain.handle("pick-exe", async (event) => {
    if (!isTrustedSender(event)) return null;
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Executable", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });

  ipcMain.handle("pick-image", async (event) => {
    if (!isTrustedSender(event)) return null;
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
      ],
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });

  ipcMain.handle("pick-log", async (event) => {
    if (!isTrustedSender(event)) return null;
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Log files", extensions: ["log", "txt", "csv", "json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });

  // Security: the renderer may only launch an executable that is registered
  // in the game library. Existence on disk is handled by the OS open call —
  // it is not the security boundary.
  ipcMain.handle("launch-game", async (event, exePath) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Unauthorized sender" };
    if (typeof exePath !== "string" || !exePath.trim()) {
      return { ok: false, error: "No executable path provided" };
    }
    try {
      const games = await getGameRepository().findAll();
      if (!isRegisteredExePath(exePath, games)) {
        return { ok: false, error: "Refused: executable is not in the registered game library" };
      }
      const error = await shell.openPath(exePath);
      if (error) return { ok: false, error };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to launch game" };
    }
  });

  // Not implemented yet — returns an empty list so the UI handles
  // "no games found" gracefully. (Legacy scanner was JSON-store bound.)
  ipcMain.handle("scan-games", async (event) => {
    if (!isTrustedSender(event)) return [];
    return [];
  });

  ipcMain.on("open-external", (event, url) => {
    if (!isTrustedSender(event)) return;
    if (isSafeHttpUrl(url)) {
      shell.openExternal(url);
    }
  });

  ipcMain.on("open-folder", async (event, folder) => {
    if (!isTrustedSender(event)) return;
    if (typeof folder !== "string" || !folder.trim()) return;
    try {
      const games = await getGameRepository().findAll();
      if (!isRegisteredFolder(folder, games)) return;
      shell.openPath(folder);
    } catch {
      // ignore open failures
    }
  });

  ipcMain.on("power-save-start", (event) => {
    if (!isTrustedSender(event)) return;
    if (powerBlockerId === null) {
      powerBlockerId = powerSaveBlocker.start("prevent-display-sleep");
    }
  });

  ipcMain.on("power-save-stop", (event) => {
    if (!isTrustedSender(event)) return;
    if (powerBlockerId !== null) {
      try {
        powerSaveBlocker.stop(powerBlockerId);
      } catch {
        // ignore
      }
      powerBlockerId = null;
    }
  });

  ipcMain.on("overlay-send", (event, data) => {
    if (!isTrustedSender(event)) return;
    sendToOverlay("overlay-update", data);
  });

  ipcMain.handle("app-get-path", (event, name) => {
    if (!isTrustedSender(event)) return null;
    if (typeof name !== "string" || !ALLOWED_PATH_NAMES.has(name)) return null;
    try {
      return app.getPath(name as Parameters<typeof app.getPath>[0]);
    } catch {
      return null;
    }
  });

  ipcMain.handle("system-get-stats", async (event) => {
    if (!isTrustedSender(event)) return null;
    try {
      return await SystemStatsService.collectSnapshot();
    } catch {
      return null;
    }
  });
}
