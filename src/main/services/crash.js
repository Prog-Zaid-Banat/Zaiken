// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

/**
 * Crash / error reporting.
 * Uses @sentry/electron when installed and ZAIKEN_SENTRY_DSN is set.
 * Otherwise logs to console only — never invents a fake backend.
 */

let sentry = null;
let enabled = false;

function initCrashReporting() {
  const dsn = process.env.ZAIKEN_SENTRY_DSN || process.env.SENTRY_DSN || '';
  if (!dsn) {
    console.info('[crash] Sentry disabled (set ZAIKEN_SENTRY_DSN to enable).');
    return;
  }
  try {
    // Optional dependency — only loads if the user installed it.
    sentry = require('@sentry/electron/main');
    sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      // Avoid sending PII by default
      sendDefaultPii: false
    });
    enabled = true;
    console.info('[crash] Sentry initialized.');
  } catch (e) {
    console.warn('[crash] @sentry/electron not available:', e.message);
  }
}

function reportError(err, context = {}) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('[reportError]', error.message, context);
  if (enabled && sentry) {
    try {
      sentry.withScope((scope) => {
        Object.keys(context || {}).forEach((k) => scope.setExtra(k, context[k]));
        sentry.captureException(error);
      });
    } catch (e) {
      console.warn('[crash] capture failed:', e.message);
    }
  }
}

module.exports = { initCrashReporting, reportError };
