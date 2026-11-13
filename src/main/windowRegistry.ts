// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: tracks the trusted BrowserWindows (main + overlay) and exposes
// sender-validation + overlay window helpers for IPC handlers.

import { BrowserWindow, type IpcMainEvent, type IpcMainInvokeEvent } from "electron";
import path from "path";

type IpcEvent = IpcMainEvent | IpcMainInvokeEvent;

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
const trustedSenderIds = new Set<number>();

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
  if (win) {
    const id = win.webContents.id;
    trustedSenderIds.add(id);
    win.webContents.once("destroyed", () => trustedSenderIds.delete(id));
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// Only windows this app created (main window or the overlay window) may talk
// to our IPC channels. Any other webContents is rejected.
export function isTrustedSender(event: IpcEvent): boolean {
  const sender = event?.sender as { id?: number; getURL?: () => string } | undefined;
  if (!sender || typeof sender.id !== "number") return false;
  return trustedSenderIds.has(sender.id);
}

export function getOrCreateOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;

  const win = new BrowserWindow({
    width: 520,
    height: 64,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });

  const id = win.webContents.id;
  trustedSenderIds.add(id);
  win.webContents.once("destroyed", () => trustedSenderIds.delete(id));

  win.loadFile(path.join(__dirname, "..", "renderer", "overlay.html")).catch(() => {
    console.error("[Overlay] Failed to load overlay.html");
  });

  win.on("closed", () => {
    overlayWindow = null;
  });

  overlayWindow = win;
  return win;
}

export function toggleOverlay(): boolean {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    return false;
  }
  getOrCreateOverlayWindow().showInactive();
  return true;
}

export function sendToOverlay(channel: string, data: unknown): boolean {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channel, data);
    return true;
  }
  return false;
}
