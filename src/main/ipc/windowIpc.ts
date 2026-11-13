// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: window controls (send-style) + overlay toggle.

import { app, ipcMain } from "electron";
import { getMainWindow, isTrustedSender, toggleOverlay } from "../windowRegistry";
import { SqliteSettingsRepository } from "../../infrastructure/database/repositories/SqliteSettingsRepository";

export function registerWindowIpcHandlers() {
  ipcMain.on("window-minimize", (event) => {
    if (!isTrustedSender(event)) return;
    getMainWindow()?.minimize();
  });

  ipcMain.on("window-maximize", (event) => {
    if (!isTrustedSender(event)) return;
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on("window-close", (event) => {
    if (!isTrustedSender(event)) return;
    const win = getMainWindow();
    if (!win) return;
    let minimizeToTray = false;
    try {
      const settings = new SqliteSettingsRepository().getAll();
      minimizeToTray = settings.minimizeToTray === true;
    } catch {
      minimizeToTray = false;
    }
    if (minimizeToTray) win.hide();
    else win.close();
  });

  ipcMain.on("window-quit", (event) => {
    if (!isTrustedSender(event)) return;
    app.quit();
  });

  ipcMain.on("toggle-overlay", (event) => {
    if (!isTrustedSender(event)) return;
    toggleOverlay();
  });
}
