import { ipcMain } from "electron";

import { getGameRepository } from "./repositoryProvider";

const authService: any = require("../services/auth");
const syncService: any = require("../services/sync");

export function setupSupabaseIpc() {


    ipcMain.handle(
        "supabase:sign-in",
        async (_, { email, password }) => {

            try {

                const data =
                    await authService.login(
    email,
    password
);


                return {
                    success: true,
                    data
                };


            } catch (error: any) {

                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );



    ipcMain.handle(
        "supabase:get-user",
        async () => {

            try {

                const user =
                    await authService.getCurrentUser();


                return {
                    success: true,
                    user
                };


            } catch (error: any) {

                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );



    ipcMain.handle(
        "supabase:sync-games",
        async () => {

            try {

                const user =
                    await authService.getCurrentUser();


                if (!user) {
                    throw new Error(
                        "يجب تسجيل الدخول أولاً لإجراء المزامنة."
                    );
                }


                const gameRepo =
                    getGameRepository();


                const localGames =
                    await gameRepo.findAll();



                await syncService.syncGamesToCloud(
                    user.id,
                    localGames
                );


                return {
                    success: true,
                    message:
                        "تمت المزامنة بنجاح وحفظ نسختك في السحاب!"
                };


            } catch (error: any) {

                return {
                    success: false,
                    error: error.message
                };

            }

        }
    );

}