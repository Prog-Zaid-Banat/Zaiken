"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: achievements handlers reject untrusted senders.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAchievementsIpcHandlers = registerAchievementsIpcHandlers;
const electron_1 = require("electron");
const SqliteAchievementsRepository_1 = require("../../infrastructure/database/repositories/SqliteAchievementsRepository");
const windowRegistry_1 = require("../windowRegistry");
const achievementsRepository = new SqliteAchievementsRepository_1.SqliteAchievementsRepository();
function registerAchievementsIpcHandlers() {
    electron_1.ipcMain.handle("db-get-achievements", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        try {
            return achievementsRepository.getAll();
        }
        catch {
            return [];
        }
    });
    electron_1.ipcMain.handle("db-evaluate-achievements", (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return [];
        try {
            return achievementsRepository.evaluate();
        }
        catch {
            return [];
        }
    });
}
