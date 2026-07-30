/**
 * EXAMPLE bootstrap — wire this into your main process gradually.
 * Do NOT replace main.js blindly; migrate handler-by-handler.
 */
import path from 'path';
import { app } from 'electron';
import { initLogger, createLogger } from '../../infrastructure/logging/Logger';
import { initDatabase, quickCheck } from '../../infrastructure/database/client';
import { migrateFromJsonIfNeeded } from '../../infrastructure/database/jsonMigrator';
import { getSecretStore } from '../../infrastructure/secrets/SecretStore';
import { createBackup } from '../../infrastructure/database/backup';

const log = createLogger('app');

export async function bootstrapFoundation(): Promise<void> {
  initLogger({ pretty: !app.isPackaged });

  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'zaiken.sqlite');
  const legacyJsonDir = path.join(userData, 'zaiken_data');
  const backupRoot = path.join(userData, 'backups');

  initDatabase(dbPath);
  const migration = migrateFromJsonIfNeeded(legacyJsonDir, dbPath);
  log.info({ migration }, 'migration status');

  const secrets = getSecretStore();
  await secrets.init();

  const check = quickCheck();
  if (!check.ok) {
    log.error({ check }, 'database integrity failed');
    try {
      createBackup(dbPath, backupRoot);
    } catch {
      /* ignore */
    }
  }

  // periodic backup every 6h while app runs
  setInterval(
    () => {
      try {
        createBackup(dbPath, backupRoot);
      } catch (e: any) {
        log.warn({ err: e?.message }, 'backup failed');
      }
    },
    6 * 60 * 60 * 1000
  ).unref?.();
}
