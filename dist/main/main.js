"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const bootstrap_1 = require("./bootstrap");
const windowRegistry_1 = require("./windowRegistry");
const IS_SMOKE_TEST = process.argv.includes("--smoke-test");
const IS_DEV = process.argv.includes("--dev");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    (0, windowRegistry_1.setMainWindow)(mainWindow);
    mainWindow.loadFile(path_1.default.join(__dirname, "../renderer/index.html"));
    // Phase 3: DevTools only in development mode — never in production.
    if (IS_DEV) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    // Phase 3: smoke-test instrumentation for scripts/electron-smoke.js
    if (IS_SMOKE_TEST) {
        mainWindow.webContents.once("did-fail-load", (_event, code, desc) => {
            console.error("[Zaiken] SMOKE renderer load failed:", code, desc);
            electron_1.app.exit(1);
        });
        mainWindow.webContents.once("did-finish-load", () => {
            console.log("[Zaiken] SMOKE renderer loaded");
        });
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
        (0, windowRegistry_1.setMainWindow)(null);
    });
}
async function start() {
    try {
        await electron_1.app.whenReady();
        await (0, bootstrap_1.bootstrap)();
        createWindow();
        console.log("[Zaiken] Application started successfully");
        if (IS_SMOKE_TEST) {
            setTimeout(() => {
                console.log("[Zaiken] SMOKE window open; quitting");
                electron_1.app.quit();
            }, 6000);
        }
    }
    catch (error) {
        console.error("[Zaiken] Fatal startup error:", error);
        if (IS_SMOKE_TEST) {
            electron_1.app.exit(1);
        }
        else {
            electron_1.app.quit();
        }
    }
}
start();
electron_1.app.on("before-quit", () => {
    (0, bootstrap_1.shutdownRuntime)();
});
// Windows / Linux
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
// macOS
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
