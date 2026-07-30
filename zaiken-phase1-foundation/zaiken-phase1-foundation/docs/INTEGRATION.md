# Integration Guide — Phase 1

## Step 1 — Install deps

```bash
npm install better-sqlite3 drizzle-orm keytar pino uuid
npm install -D typescript @types/node @types/better-sqlite3 @types/uuid drizzle-kit tsx
```

## Step 2 — Copy source

Copy `src/` folders into your project (or merge under `src/foundation`).

Recommended target layout:

```
src/
  domain/
  application/
  infrastructure/
  presentation/
  shared/
```

## Step 3 — tsconfig

Add/merge:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

## Step 4 — First boot path

In main process bootstrap:

```ts
import { initDatabase } from './infrastructure/database/client';
import { migrateFromJsonIfNeeded } from './infrastructure/database/jsonMigrator';
import { SecretStore } from './infrastructure/secrets/SecretStore';

const userData = app.getPath('userData');
const dbPath = path.join(userData, 'zaiken.sqlite');

initDatabase(dbPath);
migrateFromJsonIfNeeded(path.join(userData, 'zaiken_data'), dbPath);

// optional: move legacy aiApiKey into keychain
const secrets = new SecretStore();
// ... one-time migration helper
```

## Step 5 — Dual-run (safe)

Keep old `database.js` working until repositories are wired to all IPC handlers.
Switch handler-by-handler:

1. `db-get-games` → GameRepository
2. `db-add-session` → SessionRepository + domain XP logic
3. settings save → strip secrets → SecretStore

## Step 6 — Verify

```bash
npx tsx scripts/verify-foundation.ts
```

## Rollback

If migration fails, JSON folder backup remains untouched.
App can fall back to legacy JSON module.
