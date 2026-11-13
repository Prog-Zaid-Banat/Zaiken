// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: authenticated token bridge to the Zaiken AI server.
//
// The renderer can never supply a token. The app secret is read only inside
// this main-process module from the OS credential store (SecretStore) and a
// short-lived HS256 JWT is minted here before every request. The Authorization
// header is never logged, and error payloads are sanitized.

import jwt from "jsonwebtoken";
import { aiCredentials } from "./aiCredentials";

const DEFAULT_AI_SERVER = "http://127.0.0.1:8787";
const TOKEN_TTL_SECONDS = "15m";
const DEFAULT_TIMEOUT_MS = 90000;

export interface AiBridgeResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  needsSetup?: boolean;
  authFailed?: boolean;
}

/**
 * Only local AI servers are allowed over plain HTTP. Remote deployments must
 * use HTTPS so the token is never sent in the clear.
 */
export function isAllowedAiServerUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:") {
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }
  return false;
}

export function resolveAiServerUrl(): string {
  const configured = process.env.ZAIKEN_AI_SERVER_URL;
  if (configured && isAllowedAiServerUrl(configured)) {
    return configured.trim().replace(/\/$/, "");
  }
  return DEFAULT_AI_SERVER;
}

function mintToken(appSecret: string): string {
  return jwt.sign(
    { sub: "zaiken-desktop", iat: Math.floor(Date.now() / 1000) },
    appSecret,
    { algorithm: "HS256", expiresIn: TOKEN_TTL_SECONDS }
  );
}

function scrubSecrets(text: string): string {
  return String(text || "")
    .slice(0, 200)
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "***")
    .replace(/Bearer\s+[A-Za-z0-9._-]{10,}/gi, "Bearer ***");
}

/**
 * Sends an authenticated POST to the AI server. All credentials stay in the
 * main process; failures are mapped to safe, non-leaking messages.
 */
export async function callAiServerSafely(
  endpoint: string,
  payload: Record<string, unknown>,
  opts: { timeoutMs?: number } = {}
): Promise<AiBridgeResult> {
  if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
    return { ok: false, error: "Invalid AI server endpoint." };
  }

  const appSecret = await aiCredentials.getAppSecret();
  if (!appSecret) {
    return {
      ok: false,
      needsSetup: true,
      error:
        "AI Coach is not configured. Add an API key in Settings → AI Coach, and make sure the Zaiken AI server is running.",
    };
  }

  const baseUrl = resolveAiServerUrl();
  const target = baseUrl + endpoint;
  if (!isAllowedAiServerUrl(target)) {
    return { ok: false, error: "AI server URL is not allowed." };
  }

  const controller = new AbortController();
  const timeoutMs =
    typeof opts.timeoutMs === "number" && Number.isFinite(opts.timeoutMs)
      ? Math.max(1000, opts.timeoutMs)
      : DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${mintToken(appSecret)}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error: any) {
    const aborted = error?.name === "AbortError";
    return {
      ok: false,
      needsSetup: true,
      error: aborted
        ? "AI server timed out. Try again later."
        : "AI server is not running. Make sure the Zaiken AI server is running on port 8787.",
    };
  } finally {
    clearTimeout(timer);
  }

  // Status-only logging. Never log the Authorization header or the payload.
  const status = res.status;
  if (status >= 400) {
    if (status === 401 || status === 403) {
      return {
        ok: false,
        authFailed: true,
        needsSetup: true,
        error: "The AI server rejected the app credentials. Check the configured app secret.",
      };
    }
    if (status === 429) {
      return { ok: false, error: "AI server rate limit exceeded. Try again later." };
    }
    const raw = await res.text().catch(() => "");
    const detail = scrubSecrets(raw);
    return {
      ok: false,
      error: detail
        ? `AI server error (${status}): ${detail}`
        : `AI server error (${status}).`,
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: "AI server returned a malformed response." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "AI server returned a malformed response." };
  }
  return { ok: true, data: body };
}
