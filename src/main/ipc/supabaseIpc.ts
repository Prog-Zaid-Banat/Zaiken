// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: supabase handlers reject untrusted senders. Legacy services are
// loaded lazily so a missing optional service cannot crash handler registration.

import { ipcMain } from "electron";
import { getGameRepository } from "./repositoryProvider";
import { isTrustedSender } from "../windowRegistry";

function lazy(loader: () => any): () => any {
  let mod: any;
  return () => {
    if (!mod) mod = loader();
    return mod;
  };
}

const getAuthService = lazy(() => require("../services/auth"));
const getSyncService = lazy(() => require("../services/sync"));

export function setupSupabaseIpc() {
  ipcMain.handle("supabase:sign-in", async (event, { email, password }) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    try {
      const data = await getAuthService().login(email, password);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error?.message || "Sign-in failed" };
    }
  });

  ipcMain.handle("supabase:get-user", async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    try {
      const user = await getAuthService().getCurrentUser();
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to get user" };
    }
  });

  ipcMain.handle("supabase:sync-games", async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    try {
      const user = await getAuthService().getCurrentUser();
      if (!user) {
        throw new Error("Sign in is required before syncing.");
      }
      const syncService = getSyncService();
      const games = await getGameRepository().findAll();
      return { success: true, data: await syncService.syncGames(user, games) };
    } catch (error: any) {
      return { success: false, error: error?.message || "Sync failed" };
    }
  });
}
