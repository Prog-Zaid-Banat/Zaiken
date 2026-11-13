"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
exports.shutdownRuntime = shutdownRuntime;
const electron_1 = require("electron");
const RuntimeInitializer_js_1 = require("./tsruntime/RuntimeInitializer.js");
const authIpc_js_1 = require("./ipc/authIpc.js");
const gameIpc_js_1 = require("./ipc/gameIpc.js");
const profileIpc_js_1 = require("./ipc/profileIpc.js");
const settingsIpc_js_1 = require("./ipc/settingsIpc.js");
const achievementsIpc_js_1 = require("./ipc/achievementsIpc.js");
const systemIpc_js_1 = require("./ipc/systemIpc.js");
const windowIpc_js_1 = require("./ipc/windowIpc.js");
const sessionIpc_js_1 = require("./ipc/sessionIpc.js");
const statsIpc_js_1 = require("./ipc/statsIpc.js");
const logsIpc_js_1 = require("./ipc/logsIpc.js");
const aiIpc_js_1 = require("./ipc/aiIpc.js");
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
    (0, windowIpc_js_1.registerWindowIpcHandlers)();
    (0, sessionIpc_js_1.registerSessionIpcHandlers)();
    (0, statsIpc_js_1.registerStatsIpcHandlers)();
    (0, logsIpc_js_1.registerLogsIpcHandlers)();
    (0, aiIpc_js_1.registerAiIpcHandlers)();
    console.log("[Zaiken] IPC handlers registered");
}
function shutdownRuntime() {
    runtime.shutdown();
}
