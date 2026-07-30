# Zaiken Delivery Phases

## Phase 1 — Foundation (THIS ZIP)
- Clean Architecture layout
- SQLite + Drizzle schema + migrations
- JSON → SQLite migrator
- SecretStore
- Core repositories
- AI provider abstraction + retry/fallback
- Structured logging
- Sync port stub
- Backup helpers

## Phase 2 — Wire IPC (next)
- Replace `database.js` call sites in main.js with repositories
- Settings UI writes API keys only to SecretStore
- Keep renderer API (`window.zaiken`) stable

## Phase 3 — TypeScript main process
- Convert main services gradually to TS
- Strict ESLint/Prettier

## Phase 4 — AI streaming + richer coach UX

## Phase 5 — UI design system polish
- Skeletons, empty/error states, virtualization

## Phase 6 — Tests + packaging production
- Unit/integration/E2E
- Auto-update + signing checklist
