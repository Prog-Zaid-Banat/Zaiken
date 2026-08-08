// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { app, ipcMain } from "electron";
import { SqliteSettingsRepository } from "../../infrastructure/database/repositories/SqliteSettingsRepository";


const settingsRepository =
    new SqliteSettingsRepository();



export function registerSettingsIpcHandlers() {


    ipcMain.handle(
        "db-get-settings",
        async () => {

            return settingsRepository.getAll();

        }
    );



    ipcMain.handle(
        "db-save-settings",
        async (_, data) => {

            return settingsRepository.save(data);

        }
    );



    ipcMain.handle(
        "db-reset-all-data",
        async () => {

            settingsRepository.resetAllData();

            return { success: true };

        }
    );



    ipcMain.handle(
        "app-get-version",
        async () => {

            return app.getVersion();

        }
    );

}