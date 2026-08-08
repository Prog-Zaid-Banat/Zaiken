# Zaiken Beta Readiness Audit — 2026-08-04

## Executive verdict

**Do not release a public beta yet.** The executable package can be built and the active local database is now a sound SQLite implementation, but the repository still contains two competing architectures, has insufficient end-to-end coverage, and permits unsafe direct AI-key configuration paths.

## Scores

| Area | Score | Assessment |
| --- | ---: | --- |
| Current architecture | 52/100 | Active JS runtime works, but unused/incomplete TypeScript and duplicate service implementations remain. |
| Database | 82/100 | SQLite WAL, foreign keys, constraints, indexes, transactions, bounded retention, JSON backup/migration, and integrity check are active. Cloud conflict resolution and encrypted field storage are not yet implemented. |
| Security | 58/100 | Electron isolation/sandbox/CSP are present; remote navigation/popups and HTTP external links were tightened. AI secret handling, IPC sender authorization, server CORS/body limits, and dependency governance remain incomplete. |
| Performance | 64/100 | SQLite indexing/WAL and transactional aggregates are efficient; synchronous filesystem and database work remains on the Electron main thread. |
| Code quality | 48/100 | The active persistence boundary is coherent, but the repository is still a mixed JS/TS migration with duplicated/unused paths and inconsistent naming. |
| UX stability | 63/100 | Smoke and database tests pass and packaging succeeds, but there is no automated Electron/UI test coverage. |
| Enterprise readiness | 43/100 | Missing CI quality gates, release signing, observability policy, server hardening, typed build, and account/sync architecture. |
| Beta readiness | 45/100 | Suitable for controlled internal testing only, not public beta. |

## Verified changes

- Replaced the broken active database dependency path with a single SQLite persistence boundary in `src/main/database.js`.
- Added WAL mode, foreign-key enforcement, busy timeout, schema versioning, integrity checks, transactions, checks, indexes, foreign-key cascades, bounded AI/log retention, and normalized core tables.
- Added one-time legacy JSON migration with a timestamped backup under `userData/zaiken_data/migration-backups/` before import.
- Preserved the renderer-facing database DTO/API while rejecting unknown database columns and normalizing numeric/string inputs.
- Fixed Windows test teardown by explicitly closing the SQLite handle.
- Removed the duplicate `ipcMain` declaration that made `main.js` unparsable.
- Avoided constructing a Supabase client from empty placeholder values.
- Close SQLite cleanly on Electron shutdown.
- Deny renderer-created popup windows and non-file navigation; external links now require HTTPS.
- Fixed Windows package configuration to use the valid 256×256 PNG source instead of the invalid 16×16 ICO.

## Verification

- `npm test` — passed: 19 checks.
- `npm run lint` — passed.
- `npx electron-builder --win --dir --config.directories.output=dist-verification` — passed; unpacked app created in `dist-verification/win-unpacked`.
- The normal `dist` output remains locked by another Windows/OneDrive process after an earlier failed build. This does not invalidate the clean verification build, but must be resolved before release automation.

## Remaining problems

### Critical

- [ ] No public-beta release until the application is consolidated onto one runtime architecture. The incomplete TypeScript `src/infrastructure`, `src/domain`, and `src/main/main.ts` trees are not built or used by the packaged app.
- [ ] Move user AI credentials out of settings/config files into OS secure storage, remove direct-provider production mode, and use a server-side proxy with per-user authorization.
- [ ] Harden the AI server: restrictive CORS allowlist, request body-size limits, schema validation, structured logging/redaction, durable distributed rate limiting, and production secret rotation.

### High

- [ ] Validate every IPC sender against the expected local renderer and validate every IPC payload with a shared schema. Current database validation is not a substitute for full IPC authorization.
- [ ] Add TypeScript compilation, ESLint, formatting, dependency audit, unit/integration/UI tests, and CI gates that block release on failures.
- [ ] Remove or integrate duplicate/unreachable files (`gameLibraryDb.js`, TypeScript IPC/services, duplicate Supabase implementations) only after their callers are formally migrated.
- [ ] Establish cloud-sync model: account identity, outbox/inbox, immutable change records, conflict strategy, encryption policy, and data deletion/export requirements.
- [ ] Code-sign Windows artifacts and define update signing/release channels before distributing installers.

### Medium

- [ ] Replace synchronous main-process log/file hashing and large-file reads with bounded streaming/background work.
- [ ] Add database backup/restore UX, migration failure recovery, and telemetry consent/privacy policy.
- [ ] Eliminate `unsafe-inline` CSP allowances through external styles/scripts where feasible.
- [ ] Add accessibility, crash-recovery, upgrade/downgrade, and offline test scenarios.

### Low

- [ ] Remove stale build output once the locking process releases it.
- [ ] Resolve the existing trailing whitespace in `server/index.js` and normalize repository encoding/newlines.
- [ ] Replace development console output with consistent structured logs and redaction.

## Roadmap to a release-quality beta

| Priority | Task | Complexity | Estimate | Why it matters |
| --- | --- | --- | --- | --- |
| P0 | Consolidate the runtime onto one TypeScript/Electron composition root; delete verified dead paths | High | 5–10 days | Removes the current split-brain architecture and makes builds deterministic. |
| P0 | Secure AI credential/proxy design and server hardening | High | 4–7 days | Prevents credential exposure and abusive AI spend. |
| P0 | Shared IPC contracts, sender validation, and negative security tests | High | 3–5 days | Electron IPC is the primary desktop privilege boundary. |
| P1 | CI pipeline: typecheck, lint, tests, dependency audit, signed package smoke test | Medium | 2–4 days | Makes regressions visible before users receive them. |
| P1 | End-to-end Electron test suite for onboarding, games, sessions, settings, migrations | High | 5–8 days | The current checks do not exercise a running UI. |
| P1 | Define sync/account/audit data model and implement an outbox | High | 7–12 days | Enables safe multi-device and cloud functionality. |
| P2 | Move blocking work off the main thread and profile startup/memory | Medium | 3–5 days | Protects UI responsiveness as libraries/logs grow. |
| P2 | Backup/restore, privacy controls, data export/delete | Medium | 3–5 days | Required for user trust and recoverability. |

## Changelog attribution

This audit attributes only the changes made during this review. The working tree already contained other uncommitted modifications and deletions; they were intentionally not overwritten, removed, or represented as validated work.
