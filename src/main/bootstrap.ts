// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { app } from "electron";

import { RuntimeInitializer } from "./tsruntime/RuntimeInitializer.js";

import { registerAuthIpcHandlers } from "./ipc/authIpc.js";
import { registerGameIpcHandlers } from "./ipc/gameIpc.js";
import { registerProfileIpcHandlers } from "./ipc/profileIpc.js";
import { registerSettingsIpcHandlers } from "./ipc/settingsIpc.js";
import { registerAchievementsIpcHandlers } from "./ipc/achievementsIpc.js";
import { registerSystemIpcHandlers } from "./ipc/systemIpc.js";
import { registerWindowIpcHandlers } from "./ipc/windowIpc.js";
import { registerSessionIpcHandlers } from "./ipc/sessionIpc.js";
import { registerStatsIpcHandlers } from "./ipc/statsIpc.js";
import { registerLogsIpcHandlers } from "./ipc/logsIpc.js";
import { registerAiIpcHandlers } from "./ipc/aiIpc.js";


const runtime = new RuntimeInitializer();



export async function bootstrap(): Promise<void> {


    console.log(
        "[Zaiken] Bootstrap starting..."
    );



    // Make sure Electron is ready
    await app.whenReady();



    // Initialize database + repositories
    await runtime.initialize();



    console.log(
        "[Zaiken] Runtime initialized"
    );



    // Register IPC after database exists
    registerAuthIpcHandlers();

    registerGameIpcHandlers();

    registerProfileIpcHandlers();

    registerSettingsIpcHandlers();

    registerAchievementsIpcHandlers();

    registerSystemIpcHandlers();

    registerWindowIpcHandlers();

    registerSessionIpcHandlers();

    registerStatsIpcHandlers();

    registerLogsIpcHandlers();

    registerAiIpcHandlers();



    console.log(
        "[Zaiken] IPC handlers registered"
    );

}

export function shutdownRuntime(): void {
    runtime.shutdown();
}
