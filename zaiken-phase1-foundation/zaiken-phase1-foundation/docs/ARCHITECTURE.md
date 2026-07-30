# Zaiken Architecture (Phase 1)

## Layers

```
Presentation  → Electron main / preload / renderer (UI only)
Application   → Use cases (orchestration)
Domain        → Entities, value objects, repository interfaces
Infrastructure→ SQLite, secrets, AI providers, scanner, logger
```

### Rules

1. **Renderer never contains business logic.**
2. **Domain has zero imports from Electron, fs, or SQL.**
3. **Application depends on Domain interfaces only.**
4. **Infrastructure implements Domain interfaces.**
5. **IPC handlers are thin adapters** → call application use cases.

## Data flow

```
UI → preload bridge → IPC handler → Application use case
    → Repository interface → SQLite repository → DB
```

## Secrets

API keys and passwords never touch JSON/settings tables.
Stored via `SecretStore` (keytar → Windows Credential Manager / macOS Keychain / Linux Secret Service).

## Database

- SQLite (SQLCipher in production)
- WAL mode
- Foreign keys ON
- Drizzle ORM
- Automatic migrations
- JSON legacy migrator (one-shot)

## Future sync

`SyncPort` abstracts push/pull. Local SQLite remains source of truth offline.
PostgreSQL can implement the same port later.
