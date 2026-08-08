// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
console.log("🔥 ZAiken preload executing");
import { contextBridge, ipcRenderer } from "electron";


const zaikenAPI = {

    window: {
        minimize: (): void => {
            ipcRenderer.send("window-minimize");
        },

        maximize: (): void => {
            ipcRenderer.send("window-maximize");
        },

        close: (): void => {
            ipcRenderer.send("window-close");
        },

        quit: (): void => {
            ipcRenderer.send("window-quit");
        },

        toggleOverlay: (): void => {
            ipcRenderer.send("toggle-overlay");
        },
    },


    system: {

        openExternal: (url: string): void => {
            ipcRenderer.send("open-external", url);
        },

        openFolder: (path: string): void => {
            ipcRenderer.send("open-folder", path);
        },

        powerSaveStart: (): void => {
            ipcRenderer.send("power-save-start");
        },

        powerSaveStop: (): void => {
            ipcRenderer.send("power-save-stop");
        },


        pickExe: () =>
            ipcRenderer.invoke("pick-exe"),


        pickImage: () =>
            ipcRenderer.invoke("pick-image"),


        pickLog: () =>
            ipcRenderer.invoke("pick-log"),


        launchGame: (exePath: string) =>
            ipcRenderer.invoke(
                "launch-game",
                exePath
            ),


        scanGames: () =>
            ipcRenderer.invoke(
                "scan-games"
            ),


        getVersion: () =>
            ipcRenderer.invoke(
                "app-get-version"
            ),


        getPath: (name: string) =>
            ipcRenderer.invoke(
                "app-get-path",
                name
            ),


        sendOverlay: (data: unknown): void => {
            ipcRenderer.send(
                "overlay-send",
                data
            );
        },


        getStats: () =>
            ipcRenderer.invoke(
                "system-get-stats"
            ),
    },


    session: {

        start: (payload: unknown) =>
            ipcRenderer.invoke(
                "session-start",
                payload
            ),

        get: () =>
            ipcRenderer.invoke(
                "session-get"
            ),


        end: (payload: unknown) =>
            ipcRenderer.invoke(
                "session-end",
                payload
            ),
    },



    logs: {

        hashFile: (
            logPath: string,
            gameId: string
        ) =>
            ipcRenderer.invoke(
                "hash-log-file",
                logPath,
                gameId
            ),


        verifyHash: (
            logPath: string,
            expectedHash: string
        ) =>
            ipcRenderer.invoke(
                "verify-log-hash",
                logPath,
                expectedHash
            ),


        readTail: (
            logPath: string,
            lines: number
        ) =>
            ipcRenderer.invoke(
                "read-log-tail",
                logPath,
                lines
            ),


        startWatch: (
            logPath: string,
            gameId: string
        ) =>
            ipcRenderer.invoke(
                "start-log-watch",
                logPath,
                gameId
            ),


        stopWatch: (
            logPath: string
        ) =>
            ipcRenderer.invoke(
                "stop-log-watch",
                logPath
            ),


        getHashes: (
            gameId: string,
            limit: number
        ) =>
            ipcRenderer.invoke(
                "db-get-log-hashes",
                gameId,
                limit
            ),
    },



    games: {

        getAll: () =>
            ipcRenderer.invoke(
                "zaiken:games:get-all"
            ),


        save: (
            game: unknown
        ) =>
            ipcRenderer.invoke(
                "zaiken:games:save",
                game
            ),


        add: (
            game: unknown
        ) =>
            ipcRenderer.invoke(
                "zaiken:games:save",
                game
            ),


        update: (
            id: string,
            patch: unknown
        ) =>
            ipcRenderer.invoke(
                "zaiken:games:update",
                id,
                patch
            ),


        delete: (
            id: string
        ) =>
            ipcRenderer.invoke(
                "zaiken:games:delete",
                id
            ),
    },



    stats: {

        getForGame: (
            gameId: string
        ) =>
            ipcRenderer.invoke(
                "db-get-stats",
                gameId
            ),


        getDaily: (
            days: number
        ) =>
            ipcRenderer.invoke(
                "db-get-daily-stats",
                days
            ),
    },



    profile: {

        get: () =>
            ipcRenderer.invoke(
                "zaiken:profile:get"
            ),


        save: (
            data: unknown
        ) =>
            ipcRenderer.invoke(
                "zaiken:profile:save",
                data
            ),
    },



    achievements: {

        getAll: () =>
            ipcRenderer.invoke(
                "db-get-achievements"
            ),


        unlock: (
            id: string
        ) =>
            ipcRenderer.invoke(
                "db-unlock-achievement",
                id
            ),


        updateProgress: (
            id: string,
            progress: number
        ) =>
            ipcRenderer.invoke(
                "db-update-achievement-progress",
                id,
                progress
            ),


        evaluate: () =>
            ipcRenderer.invoke(
                "db-evaluate-achievements"
            ),
    },



    settings: {

        get: () =>
            ipcRenderer.invoke(
                "db-get-settings"
            ),


        save: (
            data: unknown
        ) =>
            ipcRenderer.invoke(
                "db-save-settings",
                data
            ),


        resetAllData: () =>
            ipcRenderer.invoke(
                "db-reset-all-data"
            ),
    },



    ai: {

        status: () =>
            ipcRenderer.invoke(
                "ai-status"
            ),


        ask: (
            payload: unknown
        ) =>
            ipcRenderer.invoke(
                "ai-ask",
                payload
            ),


        dailyReport: (
            gameName: string
        ) =>
            ipcRenderer.invoke(
                "ai-daily-report",
                gameName
            ),


        dailyReportsBatch: (
            games: string[]
        ) =>
            ipcRenderer.invoke(
                "ai-daily-reports-batch",
                games
            ),


        getReports: () =>
            ipcRenderer.invoke(
                "db-get-ai-reports"
            ),


        saveReport: (
            report: unknown
        ) =>
            ipcRenderer.invoke(
                "db-save-ai-report",
                report
            ),
    },



    auth: {

        register: (
            email: string,
            password: string
        ) =>
            ipcRenderer.invoke(
                "auth-register",
                email,
                password
            ),


        login: (
            email: string,
            password: string
        ) =>
            ipcRenderer.invoke(
                "auth-login",
                email,
                password
            ),


        logout: () =>
            ipcRenderer.invoke(
                "auth-logout"
            ),


        getCurrentUser: () =>
            ipcRenderer.invoke(
                "auth-current-user"
            ),
    },

};



contextBridge.exposeInMainWorld(
    "zaiken",
    zaikenAPI
);

console.log("ZAiken preload loaded");