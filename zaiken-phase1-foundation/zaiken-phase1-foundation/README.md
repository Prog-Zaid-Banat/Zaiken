# Zaiken Phase 1 — Foundation Package

**Goal:** Production-grade foundation without breaking current features.

This package is designed to be **copied into** your existing repo and integrated gradually.

## What this phase includes

1. Clean Architecture folder layout
2. SQLite + Drizzle schema (normalized)
3. Migration runner + JSON → SQLite migrator
4. SecretStore (OS keychain / credential manager)
5. Repository interfaces + SQLite implementations
6. AI provider abstraction (OpenAI, Anthropic, OpenRouter, Groq, custom)
7. Structured logger
8. Sync port (future PostgreSQL)
9. Integration guide

## What this phase does NOT fully replace yet

- Full renderer UI redesign
- Complete rewrite of every existing page
- E2E suite
- Code signing certificates

Those come in later phases.

## Quick integrate

```bash
# from your Zaiken repo root
cp -r path/to/zaiken-phase1-foundation/src ./src-foundation
cp -r path/to/zaiken-phase1-foundation/docs ./docs
```

Then follow `docs/INTEGRATION.md`.

## Dependencies to add

```bash
npm install better-sqlite3 drizzle-orm keytar pino pino-pretty uuid
npm install -D typescript @types/node @types/better-sqlite3 drizzle-kit tsx
```

> SQLCipher: use a SQLCipher-enabled better-sqlite3 build in production, or `@journeyapps/sqlcipher` if you prefer that package. Schema and repositories stay the same.

## License

Same as Zaiken — Proprietary © 2026 Zaid Bilal Banat.
