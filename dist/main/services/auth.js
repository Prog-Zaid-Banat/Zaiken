"use strict";
// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const SqliteUserRepository_1 = require("../../infrastructure/database/repositories/SqliteUserRepository");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SCRYPT_KEYLEN = 64;
function hashPassword(password, salt) {
    return crypto_1.default
        .scryptSync(password, salt, SCRYPT_KEYLEN)
        .toString("hex");
}
function validateCredentials(email, password) {
    if (!email ||
        !EMAIL_RE.test(String(email).trim())) {
        throw new Error("Please enter a valid email address.");
    }
    if (!password ||
        String(password).length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
}
function createAuthService() {
    const userRepository = new SqliteUserRepository_1.SqliteUserRepository();
    return {
        register: async (email, password) => {
            validateCredentials(email, password);
            const existingUser = userRepository.findByEmail(email);
            if (existingUser) {
                throw new Error("An account with this email already exists.");
            }
            const salt = crypto_1.default
                .randomBytes(16)
                .toString("hex");
            const passwordHash = hashPassword(password, salt);
            const user = userRepository.addUser({
                id: crypto_1.default.randomUUID(),
                email,
                passwordHash,
                salt
            });
            userRepository.setCurrentUserId(user.id);
            return {
                uid: user.id,
                email: user.email
            };
        },
        login: async (email, password) => {
            validateCredentials(email, password);
            const user = userRepository.findByEmail(email);
            const invalidCredentials = () => new Error("Invalid email or password.");
            if (!user) {
                throw invalidCredentials();
            }
            const inputHash = Buffer.from(hashPassword(password, user.salt), "hex");
            const storedHash = Buffer.from(user.passwordHash, "hex");
            const isValid = inputHash.length === storedHash.length &&
                crypto_1.default.timingSafeEqual(inputHash, storedHash);
            if (!isValid) {
                throw invalidCredentials();
            }
            userRepository.setCurrentUserId(user.id);
            return {
                uid: user.id,
                email: user.email
            };
        },
        logout: async () => {
            userRepository.setCurrentUserId(null);
        },
        getCurrentUser: async () => {
            const uid = userRepository.getCurrentUserId();
            if (!uid) {
                return null;
            }
            const user = userRepository.getUserById(uid);
            if (!user) {
                return null;
            }
            return {
                uid: user.id,
                email: user.email
            };
        }
    };
}
exports.default = createAuthService();
