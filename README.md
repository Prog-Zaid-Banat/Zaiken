# Zaiken

**Positioning:** closer to **Playnite + Overwolf** than to Steam/Epic stores.

- **Playnite side:** unified local library — scan Epic / Steam / GOG installs, launch from one place, track sessions & stats.
- **Overwolf side:** in-game overlay (CPU/RAM/ping/GPU), AI coach, achievements, lightweight companion tools.

Zaiken does **not** replace digital storefronts. It sits **on top** of them.

## Run

```bash
npm install
npm start
```

Windows: double-click `start.bat`.

## Auto-Scan (Windows)

Detects games from:

1. **Epic** – `%ProgramData%\Epic\...\Manifests\*.item` + Epic Games folders
2. **Steam** – `appmanifest_*.acf` across all libraries
3. **GOG** – standard Galaxy game folders
4. **Well-known** fallbacks (Valorant, Warframe, etc.)

## Features (current)

- Local game library + session tracking
- System overlay metrics (CPU/RAM/ping/GPU when available)
- **Cloud AI Coach** (OpenAI / OpenRouter / Anthropic / Groq) + optional web research + daily esport reports — requires your API key in Settings
- Achievements & profile (local)
- Local auth (scrypt) + signed JSON data store

## Intentionally disabled

**Tournaments:** temporarily disabled pending a real backend, anti-cheat, and compliance review.

**Store / wallet / test funds:** temporarily disabled pending real payments (e.g. Stripe) and compliance review. Do not reintroduce fake “Add Test Funds” or local purchases as if they were real commerce.  
Do not reintroduce hardcoded prize pools or fake leaderboards.

## Security notes (Phase 1)

- Renderer `sandbox: true` on main + overlay windows
- CSP on `index.html` / `overlay.html`
- Optional Sentry via `ZAIKEN_SENTRY_DSN` + `@sentry/electron`
- Optional auto-update via `electron-updater` (configure `build.publish` GitHub owner/repo)
- Packaged builds: `scripts/afterPack.js` flips Electron fuses when `@electron/fuses` is installed
- CI: `.github/workflows/ci.yml` runs lint + tests
- **Code signing:** set `CSC_LINK` / `CSC_KEY_PASSWORD` (Windows) or Apple notarization secrets for trusted installers — not configured by default

## Roadmap (companion platform)

1. Security hardening (sandbox, CSP, fuses, auto-update, crash reporting)
2. Reliable overlay over more game window modes
3. Real backend (accounts, sync, payments)
4. Real LLM-backed coach
5. Real telemetry + multi-OS scanning + catalog metadata
6. Full i18n + legal onboarding

## License

Proprietary — Copyright © 2026 Zaid Bilal Banat.
