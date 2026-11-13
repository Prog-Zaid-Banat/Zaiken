"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: auth handlers now reject untrusted senders.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthIpcHandlers = registerAuthIpcHandlers;
const electron_1 = require("electron");
const windowRegistry_1 = require("../windowRegistry");
function registerAuthIpcHandlers() {
    const getAuthService = async () => {
        const module = await Promise.resolve().then(() => __importStar(require("../services/auth")));
        return module.default;
    };
    electron_1.ipcMain.handle("auth-register", async (event, email, password) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        const authService = await getAuthService();
        try {
            return await authService.register(email, password);
        }
        catch (error) {
            return { success: false, error: error?.message || "Registration failed" };
        }
    });
    electron_1.ipcMain.handle("auth-login", async (event, email, password) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        const authService = await getAuthService();
        try {
            return await authService.login(email, password);
        }
        catch (error) {
            return { success: false, error: error?.message || "Login failed" };
        }
    });
    electron_1.ipcMain.handle("auth-logout", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return { success: false, error: "Unauthorized sender" };
        const authService = await getAuthService();
        try {
            return await authService.logout();
        }
        catch (error) {
            return { success: false, error: error?.message || "Logout failed" };
        }
    });
    electron_1.ipcMain.handle("auth-current-user", async (event) => {
        if (!(0, windowRegistry_1.isTrustedSender)(event))
            return null;
        const authService = await getAuthService();
        try {
            return await authService.getCurrentUser();
        }
        catch {
            return null;
        }
    });
}
