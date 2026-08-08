"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSupabaseIpc = setupSupabaseIpc;
const electron_1 = require("electron");
const repositoryProvider_1 = require("./repositoryProvider");
const authService = require("../services/auth");
const syncService = require("../services/sync");
function setupSupabaseIpc() {
    electron_1.ipcMain.handle("supabase:sign-in", async (_, { email, password }) => {
        try {
            const data = await authService.login(email, password);
            return {
                success: true,
                data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("supabase:get-user", async () => {
        try {
            const user = await authService.getCurrentUser();
            return {
                success: true,
                user
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("supabase:sync-games", async () => {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                throw new Error("يجب تسجيل الدخول أولاً لإجراء المزامنة.");
            }
            const gameRepo = (0, repositoryProvider_1.getGameRepository)();
            const localGames = await gameRepo.findAll();
            await syncService.syncGamesToCloud(user.id, localGames);
            return {
                success: true,
                message: "تمت المزامنة بنجاح وحفظ نسختك في السحاب!"
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    });
}
