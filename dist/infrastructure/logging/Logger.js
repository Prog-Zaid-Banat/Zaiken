"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLogger = initLogger;
exports.createLogger = createLogger;
exports.getRootLogger = getRootLogger;
/**
 * Structured enterprise logger
 * Copyright © 2026 Zaid Bilal Banat
 */
const pino_1 = __importDefault(require("pino"));
let root = null;
function initLogger(options) {
    const level = options?.level || process.env.ZAIKEN_LOG_LEVEL || 'info';
    const pretty = options?.pretty ?? process.env.NODE_ENV !== 'production';
    root = (0, pino_1.default)({
        level,
        base: { app: 'zaiken' },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        transport: pretty
            ? {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard' },
            }
            : undefined,
    });
}
function createLogger(domain) {
    if (!root)
        initLogger();
    return root.child({ domain });
}
function getRootLogger() {
    if (!root)
        initLogger();
    return root;
}
