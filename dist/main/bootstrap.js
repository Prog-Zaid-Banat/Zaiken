"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const electron_1 = require("electron");
const RuntimeInitializer_js_1 = require("./tsruntime/RuntimeInitializer.js");
const authIpc_js_1 = require("./ipc/authIpc.js");
const gameIpc_js_1 = require("./ipc/gameIpc.js");
const profileIpc_js_1 = require("./ipc/profileIpc.js");
const settingsIpc_js_1 = require("./ipc/settingsIpc.js");
const achievementsIpc_js_1 = require("./ipc/achievementsIpc.js");
const systemIpc_js_1 = require("./ipc/systemIpc.js");
const runtime = new RuntimeInitializer_js_1.RuntimeInitializer();
async function bootstrap() {
    console.log("[Zaiken] Bootstrap starting...");
    // Make sure Electron is ready
    await electron_1.app.whenReady();
    // Initialize database + repositories
    await runtime.initialize();
    console.log("[Zaiken] Runtime initialized");
    // Register IPC after database exists
    (0, authIpc_js_1.registerAuthIpcHandlers)();
    (0, gameIpc_js_1.registerGameIpcHandlers)();
    (0, profileIpc_js_1.registerProfileIpcHandlers)();
    (0, settingsIpc_js_1.registerSettingsIpcHandlers)();
    (0, achievementsIpc_js_1.registerAchievementsIpcHandlers)();
    (0, systemIpc_js_1.registerSystemIpcHandlers)();
    console.log("[Zaiken] IPC handlers registered");
}
