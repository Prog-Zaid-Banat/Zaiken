import { ipcMain } from "electron";
import { getGameRepository } from "./repositoryProvider";
import { SqliteSessionRepository } from "../../infrastructure/database/repositories/SqliteSessionRepository";
import { isTrustedSender } from "../windowRegistry";
import { gameCreateSchema, gameUpdateSchema, parseGameId } from "./validationSchemas";


const sessionRepository =
    new SqliteSessionRepository();


export function registerGameIpcHandlers() {


    ipcMain.handle(
        "zaiken:games:get-all",
        async (event) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            try {

                const gameRepository =
                    getGameRepository();


                const games =
                    await gameRepository.findAll();


                return {
                    success: true,
                    data: games
                };


            } catch (error: any) {

                console.error(
                    "[IPC Error] Failed to fetch games:",
                    error
                );


                return {
                    success: false,
                    error:
                        error.message ||
                        "Unknown database error"
                };

            }

        }
    );



    ipcMain.handle(
        "zaiken:games:save",
        async (event, gameData) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            try {

                const parsed = gameCreateSchema.safeParse(gameData);
                if (!parsed.success) {
                    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid game data" };
                }

                const gameRepository =
                    getGameRepository();


                const saved =
                    await gameRepository.add(
                        parsed.data
                    );


                return {
                    success: true,
                    data: saved
                };


            } catch (error: any) {

                console.error(
                    "[IPC Error] Failed to save game:",
                    error
                );


                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );



    ipcMain.handle(
        "zaiken:games:update",
        async (event, id, patch) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            try {

                const parsedId = parseGameId(id);
                const parsedPatch = gameUpdateSchema.safeParse(patch);
                if (!parsedId.success) {
                    return { success: false, error: parsedId.error.issues[0]?.message ?? "Invalid game ID" };
                }
                if (!parsedPatch.success) {
                    return { success: false, error: parsedPatch.error.issues[0]?.message ?? "Invalid game update" };
                }

                const gameRepository =
                    getGameRepository();


                const updated =
                    await gameRepository.update(
                        parsedId.data,
                        parsedPatch.data
                    );


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


            } catch (error: any) {

                console.error(
                    "[IPC Error] Failed to update game:",
                    error
                );


                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );



    ipcMain.handle(
        "zaiken:games:delete",
        async (event, gameId) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            try {

                const parsedId = parseGameId(gameId);
                if (!parsedId.success) {
                    return { success: false, error: parsedId.error.issues[0]?.message ?? "Invalid game ID" };
                }

                const gameRepository =
                    getGameRepository();


                await gameRepository.delete(
                    parsedId.data
                );


                return {
                    success: true
                };


            } catch (error: any) {

                console.error(
                    "[IPC Error] Failed to delete game:",
                    error
                );


                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );


    ipcMain.handle(
        "db-add-session",
        async (event, gameId, minutes, stats) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            if (typeof gameId !== "string" || !gameId.trim()) {
                return { success: false, error: "gameId is required" };
            }

            const m =
                Math.max(0, Math.round(Number(minutes) || 0));

            const s =
                stats && typeof stats === "object"
                    ? stats
                    : {};

            try {

                const startedAt =
                    new Date(
                        Date.now() - m * 60_000
                    ).toISOString();

                await sessionRepository.add({
                    gameId,
                    minutes: m,
                    kills: Number(s.kills) || 0,
                    deaths: Number(s.deaths) || 0,
                    wins: Number(s.wins) || 0,
                    losses: Number(s.losses) || 0,
                    matches: Number(s.matches) || 0,
                    startedAt,
                    endedAt: new Date().toISOString()
                });

                return { success: true };


            } catch (error: any) {

                return {
                    success: false,
                    error:
                        error?.message ||
                        "Failed to add session"
                };

            }

        }
    );

}