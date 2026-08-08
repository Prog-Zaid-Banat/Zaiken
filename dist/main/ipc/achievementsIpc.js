"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAchievementsIpcHandlers = registerAchievementsIpcHandlers;
const electron_1 = require("electron");
const SqliteAchievementsRepository_1 = require("../../infrastructure/database/repositories/SqliteAchievementsRepository");
const achievementsRepository = new SqliteAchievementsRepository_1.SqliteAchievementsRepository();
function registerAchievementsIpcHandlers() {
    electron_1.ipcMain.handle("db-get-achievements", async () => {
        return achievementsRepository.getAll();
    });
    electron_1.ipcMain.handle("db-evaluate-achievements", async () => {
        return achievementsRepository.evaluate();
    });
}
