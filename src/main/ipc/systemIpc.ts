// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { ipcMain, dialog, shell } from "electron";


export function registerSystemIpcHandlers() {


    ipcMain.handle(
        "pick-exe",
        async () => {

            const result =
                await dialog.showOpenDialog({
                    properties: ["openFile"],
                    filters: [
                        { name: "Executable", extensions: ["exe"] }
                    ]
                });

            if (result.canceled || !result.filePaths.length) {

                return null;

            }

            return result.filePaths[0];

        }
    );



    ipcMain.handle(
        "pick-image",
        async () => {

            const result =
                await dialog.showOpenDialog({
                    properties: ["openFile"],
                    filters: [
                        {
                            name: "Images",
                            extensions: ["png", "jpg", "jpeg", "webp", "gif"]
                        }
                    ]
                });

            if (result.canceled || !result.filePaths.length) {

                return null;

            }

            return result.filePaths[0];

        }
    );



    ipcMain.handle(
        "pick-log",
        async () => {

            const result =
                await dialog.showOpenDialog({
                    properties: ["openFile"],
                    filters: [
                        { name: "Log files", extensions: ["log", "txt"] }
                    ]
                });

            if (result.canceled || !result.filePaths.length) {

                return null;

            }

            return result.filePaths[0];

        }
    );



    ipcMain.handle(
        "launch-game",
        async (_, exePath: string) => {

            if (!exePath) {

                return { success: false, error: "No executable path provided" };

            }

            try {

                const error =
                    await shell.openPath(exePath);

                if (error) {

                    return { success: false, error };

                }

                return { success: true };

            } catch (err: any) {

                return {
                    success: false,
                    error: err?.message || "Failed to launch game"
                };

            }

        }
    );



    // Auto-scan for installed games (Steam/Epic/GOG libraries).
    // Not implemented yet — returns an empty list so the UI can
    // handle "no games found" gracefully instead of throwing.
    ipcMain.handle(
        "scan-games",
        async () => {

            return [];

        }
    );

}