/**
 * Structured enterprise logger
 * Copyright © 2026 Zaid Bilal Banat
 */
import pino, { Logger as PinoLogger } from 'pino';

let root: PinoLogger | null = null;

export type LogDomain =
  | 'app'
  | 'database'
  | 'ai'
  | 'updates'
  | 'security'
  | 'performance'
  | 'ipc'
  | 'scanner';

export function initLogger(options?: { level?: string; pretty?: boolean }): void {
  const level = options?.level || process.env.ZAIKEN_LOG_LEVEL || 'info';
  const pretty = options?.pretty ?? process.env.NODE_ENV !== 'production';

  root = pino({
    level,
    base: { app: 'zaiken' },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  });
}

export function createLogger(domain: LogDomain | string): PinoLogger {
  if (!root) initLogger();
  return root!.child({ domain });
}

export function getRootLogger(): PinoLogger {
  if (!root) initLogger();
  return root!;
}
