"use strict";
// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: probes the local AI daemon/server health endpoint. No electron
// imports so it can be unit-tested under plain Node.
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeAiHealth = probeAiHealth;
async function probeAiHealth(baseUrl, timeoutMs = 1500) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
        res = await fetch(`${baseUrl}/health`, { signal: ctrl.signal });
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
    if (!res.ok)
        return null;
    const body = (await res.json().catch(() => ({})));
    return {
        provider: typeof body.provider === "string" ? body.provider : null,
        model: typeof body.model === "string" ? body.model : null,
        webSearch: body.webSearch === true,
        hasKey: body.hasKey === true,
    };
}
