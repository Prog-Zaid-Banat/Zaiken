"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGameIpcHandlers = registerGameIpcHandlers;
const electron_1 = require("electron");
const repositoryProvider_1 = require("./repositoryProvider");
function registerGameIpcHandlers() {
    electron_1.ipcMain.handle("zaiken:games:get-all", async () => {
        try {
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            const games = await gameRepository.findAll();
            return {
                success: true,
                data: games
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to fetch games:", error);
            return {
                success: false,
                error: error.message ||
                    "Unknown database error"
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:save", async (_, gameData) => {
        try {
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            if (!gameData ||
                !gameData.name) {
                throw new Error("Game name is required");
            }
            const saved = await gameRepository.add(gameData);
            return {
                success: true,
                data: saved
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to save game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:update", async (_, id, patch) => {
        try {
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            if (!id) {
                throw new Error("Game ID is required");
            }
            const updated = await gameRepository.update(id, patch);
            if (!updated) {
                return {
                    success: false,
                    error: "Game not found"
                };
            }
            return {
                success: true,
                data: updated
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to update game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("zaiken:games:delete", async (_, gameId) => {
        try {
            const gameRepository = (0, repositoryProvider_1.getGameRepository)();
            if (!gameId) {
                throw new Error("Game ID is required");
            }
            await gameRepository.delete(gameId);
            return {
                success: true
            };
        }
        catch (error) {
            console.error("[IPC Error] Failed to delete game:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
}
