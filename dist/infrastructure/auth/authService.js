"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
exports.authService = {
    async register(email, password) {
        // مؤقتاً إلى أن تربطه مع Supabase
        console.log("[Auth] Register:", email);
        return {
            success: true,
            user: {
                id: crypto.randomUUID(),
                email
            }
        };
    },
    async login(email, password) {
        console.log("[Auth] Login:", email);
        return {
            success: true,
            user: {
                id: crypto.randomUUID(),
                email
            }
        };
    }
};
