// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { ipcMain } from "electron";


export function registerAuthIpcHandlers() {


    const getAuthService = async () => {

        const module =
            await import("../services/auth");

        return module.default;

    };



    ipcMain.handle(
        "auth-register",
        async (_, email, password) => {

            const authService =
                await getAuthService();


            return await authService.register(
                email,
                password
            );

        }
    );





    ipcMain.handle(
        "auth-login",
        async (_, email, password) => {

            const authService =
                await getAuthService();


            return await authService.login(
                email,
                password
            );

        }
    );





    ipcMain.handle(
        "auth-logout",
        async () => {

            const authService =
                await getAuthService();


            return await authService.logout();

        }
    );





    ipcMain.handle(
        "auth-current-user",
        async () => {

            const authService =
                await getAuthService();


            return await authService.getCurrentUser();

        }
    );


}