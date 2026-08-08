"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const bootstrap_1 = require("./bootstrap");
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
            sandbox: false
        }
    });
    mainWindow.loadFile(path_1.default.join(__dirname, "../renderer/index.html"));
    mainWindow.webContents.openDevTools();
    // فتح DevTools فقط في وضع التطوير
    if (process.argv.includes("--dev")) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
async function start() {
    try {
        await electron_1.app.whenReady();
        await (0, bootstrap_1.bootstrap)();
        createWindow();
        console.log("[Zaiken] Application started successfully");
    }
    catch (error) {
        console.error("[Zaiken] Fatal startup error:", error);
        electron_1.app.quit();
    }
}
start();
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
