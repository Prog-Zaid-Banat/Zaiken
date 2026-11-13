"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: tracks the trusted BrowserWindows (main + overlay) and exposes
// sender-validation + overlay window helpers for IPC handlers.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMainWindow = setMainWindow;
exports.getMainWindow = getMainWindow;
exports.isTrustedSender = isTrustedSender;
exports.getOrCreateOverlayWindow = getOrCreateOverlayWindow;
exports.toggleOverlay = toggleOverlay;
exports.sendToOverlay = sendToOverlay;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let mainWindow = null;
let overlayWindow = null;
const trustedSenderIds = new Set();
function setMainWindow(win) {
    mainWindow = win;
    if (win) {
        const id = win.webContents.id;
        trustedSenderIds.add(id);
        win.webContents.once("destroyed", () => trustedSenderIds.delete(id));
    }
}
function getMainWindow() {
    return mainWindow;
}
// Only windows this app created (main window or the overlay window) may talk
// to our IPC channels. Any other webContents is rejected.
function isTrustedSender(event) {
    const sender = event?.sender;
    if (!sender || typeof sender.id !== "number")
        return false;
    return trustedSenderIds.has(sender.id);
}
function getOrCreateOverlayWindow() {
    if (overlayWindow && !overlayWindow.isDestroyed())
        return overlayWindow;
    const win = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, "..", "preload.js"),
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
    win.loadFile(path_1.default.join(__dirname, "..", "renderer", "overlay.html")).catch(() => {
        console.error("[Overlay] Failed to load overlay.html");
    });
    win.on("closed", () => {
        overlayWindow = null;
    });
    overlayWindow = win;
    return win;
}
function toggleOverlay() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
        return false;
    }
    getOrCreateOverlayWindow().showInactive();
    return true;
}
function sendToOverlay(channel, data) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send(channel, data);
        return true;
    }
    return false;
}
