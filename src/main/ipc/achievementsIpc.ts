// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { ipcMain } from "electron";
import { SqliteAchievementsRepository } from "../../infrastructure/database/repositories/SqliteAchievementsRepository";


const achievementsRepository =
    new SqliteAchievementsRepository();



export function registerAchievementsIpcHandlers() {


    ipcMain.handle(
        "db-get-achievements",
        async () => {

            return achievementsRepository.getAll();

        }
    );



    ipcMain.handle(
        "db-evaluate-achievements",
        async () => {

            return achievementsRepository.evaluate();

        }
    );

}