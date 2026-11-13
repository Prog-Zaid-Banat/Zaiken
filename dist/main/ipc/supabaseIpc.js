"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: supabase handlers reject untrusted senders. Legacy services are
// loaded lazily so a missing optional service cannot crash handler registration.
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSupabaseIpc = setupSupabaseIpc;
const electron_1 = require("electron");
const repositoryProvider_1 = require("./repositoryProvider");
const windowRegistry_1 = require("../windowRegistry");
function lazy(loader) {
    let mod;
    return () => {
        if (!mod)
            mod = loader();
        return mod;
    };
}
const getAuthService = lazy(() => require("../services/auth"));
const getSyncService = lazy(() => require("../services/sync"));
function setupSupabaseIpc() {
    electron_1.ipcMain.handle("supabase:sign-in", async (event, { email, password }) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        try {
            const data = await getAuthService().login(email, password);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error?.message || "Sign-in failed" };
        }
    });
    electron_1.ipcMain.handle("supabase:get-user", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        try {
            const user = await getAuthService().getCurrentUser();
            return { success: true, user };
        }
        catch (error) {
            return { success: false, error: error?.message || "Failed to get user" };
        }
    });
    electron_1.ipcMain.handle("supabase:sync-games", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        try {
            const user = await getAuthService().getCurrentUser();
            if (!user) {
                throw new Error("Sign in is required before syncing.");
            }
            const syncService = getSyncService();
            const games = await (0, repositoryProvider_1.getGameRepository)().findAll();
            return { success: true, data: await syncService.syncGames(user, games) };
        }
        catch (error) {
            return { success: false, error: error?.message || "Sync failed" };
        }
    });
}
