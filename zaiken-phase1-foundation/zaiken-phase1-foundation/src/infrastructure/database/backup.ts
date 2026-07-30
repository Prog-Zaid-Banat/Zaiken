/**
 * Database backup + restore helpers
 * Copyright © 2026 Zaid Bilal Banat
 */
import fs from 'fs';
import path from 'path';
import { getSqlite } from './client';
import { createLogger } from '../logging/Logger';

const log = createLogger('database');

export function createBackup(dbPath: string, backupRoot: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(backupRoot, `backup_${stamp}`);
  fs.mkdirSync(dir, { recursive: true });

  // checkpoint WAL so main file is consistent
  try {
    getSqlite().pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    /* db may not be open in some tooling contexts */
  }

  const base = path.basename(dbPath);
  fs.copyFileSync(dbPath, path.join(dir, base));
  for (const suffix of ['-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dir, base + suffix));
  }

  log.info({ dir }, 'backup created');
  return dir;
}

export function listBackups(backupRoot: string): string[] {
  if (!fs.existsSync(backupRoot)) return [];
  return fs
    .readdirSync(backupRoot)
    .filter((n) => n.startsWith('backup_'))
    .sort()
    .reverse()
    .map((n) => path.join(backupRoot, n));
}
