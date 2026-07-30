# Database Schema & Migrations

## Engine

- SQLite file: `{userData}/zaiken.sqlite`
- Journal: WAL
- Foreign keys: ON
- ORM: Drizzle

## Encryption

Production should use SQLCipher (passphrase from SecretStore or OS-protected key).

Development can run plain SQLite for speed.

## Tables

- users
- auth_session
- profiles
- games
- play_sessions
- achievements
- ai_reports
- log_hashes
- settings (non-secret only)
- secret_refs (metadata only)
- schema_meta

## Migrations

Files in `src/infrastructure/database/migrations/`:

- `0001_init.sql` — base schema

Runner applies in order, records version in `schema_meta`.

## Backup

`BackupService.createBackup()` copies sqlite + wal + shm to timestamped folder.

## Integrity

- `PRAGMA quick_check`
- optional `PRAGMA integrity_check`
- on failure → open recovery UI, restore last backup
