import { ipcMain } from "electron";
import { getGameRepository } from "./repositoryProvider";


export function registerGameIpcHandlers() {


    ipcMain.handle(
        "zaiken:games:get-all",
        async () => {

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
        async (_, gameData) => {

            try {

                const gameRepository =
                    getGameRepository();


                if (
                    !gameData ||
                    !gameData.name
                ) {

                    throw new Error(
                        "Game name is required"
                    );

                }


                const saved =
                    await gameRepository.add(
                        gameData
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
        async (_, id, patch) => {

            try {

                const gameRepository =
                    getGameRepository();


                if (!id) {

                    throw new Error(
                        "Game ID is required"
                    );

                }


                const updated =
                    await gameRepository.update(
                        id,
                        patch
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
        async (_, gameId) => {

            try {

                const gameRepository =
                    getGameRepository();


                if (!gameId) {

                    throw new Error(
                        "Game ID is required"
                    );

                }


                await gameRepository.delete(
                    gameId
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

}