"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfileIpcHandlers = registerProfileIpcHandlers;
const electron_1 = require("electron");
const SqliteProfileRepository_1 = require("../../infrastructure/database/repositories/SqliteProfileRepository");
const profileRepository = new SqliteProfileRepository_1.SqliteProfileRepository();
function registerProfileIpcHandlers() {
    electron_1.ipcMain.handle("zaiken:profile:get", async () => {
        return await profileRepository.findCurrent();
    });
    electron_1.ipcMain.handle("zaiken:profile:save", async (_, data) => {
        return await profileRepository.update(data);
    });
}
