"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfileIpcHandlers = registerProfileIpcHandlers;
const electron_1 = require("electron");
const SqliteProfileRepository_1 = require("../../infrastructure/database/repositories/SqliteProfileRepository");
const SqliteAchievementsRepository_1 = require("../../infrastructure/database/repositories/SqliteAchievementsRepository");
const validationSchemas_1 = require("./validationSchemas");
const windowRegistry_1 = require("../windowRegistry");
const profileRepository = new SqliteProfileRepository_1.SqliteProfileRepository();
const achievementsRepository = new SqliteAchievementsRepository_1.SqliteAchievementsRepository();
function registerProfileIpcHandlers() {
    electron_1.ipcMain.handle("zaiken:profile:get", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        return await profileRepository.findCurrent();
    });
    electron_1.ipcMain.handle("zaiken:profile:save", async (event, data) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        return await profileRepository.update(data);
    });
    electron_1.ipcMain.handle("db-record-match", async (event, data) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event)) {
            return { success: false, error: "Unauthorized sender" };
        }
        const parsed = validationSchemas_1.recordMatchSchema.safeParse(data);
        if (!parsed.success) {
            return { success: false, error: "Invalid match payload" };
        }
        try {
            const profile = await profileRepository.recordMatch(parsed.data);
            let unlocked = [];
            try {
                unlocked =
                    achievementsRepository.evaluate() || [];
            }
            catch {
                unlocked = [];
            }
            return {
                success: true,
                profile,
                unlocked
            };
        }
        catch (error) {
            return {
                success: false,
                error: error?.message ||
                    "Failed to record match"
            };
        }
    });
}
