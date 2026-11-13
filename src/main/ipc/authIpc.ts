// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: auth handlers now reject untrusted senders.

import { ipcMain } from "electron";
import { isTrustedSender } from "../windowRegistry";

export function registerAuthIpcHandlers() {
  const getAuthService = async () => {
    const module = await import("../services/auth");
    return module.default;
  };

  ipcMain.handle("auth-register", async (event, email, password) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    const authService = await getAuthService();
    try {
      return await authService.register(email, password);
    } catch (error: any) {
      return { success: false, error: error?.message || "Registration failed" };
    }
  });

  ipcMain.handle("auth-login", async (event, email, password) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    const authService = await getAuthService();
    try {
      return await authService.login(email, password);
    } catch (error: any) {
      return { success: false, error: error?.message || "Login failed" };
    }
  });

  ipcMain.handle("auth-logout", async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: "Unauthorized sender" };
    const authService = await getAuthService();
    try {
      return await authService.logout();
    } catch (error: any) {
      return { success: false, error: error?.message || "Logout failed" };
    }
  });

  ipcMain.handle("auth-current-user", async (event) => {
    if (!isTrustedSender(event)) return null;
    const authService = await getAuthService();
    try {
      return await authService.getCurrentUser();
    } catch {
      return null;
    }
  });
}
