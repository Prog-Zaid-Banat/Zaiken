'use strict';

// Tokens are never persisted in SQLite, settings JSON, or renderer state.
// keytar maps to Windows Credential Manager on Windows (Keychain on macOS).
const SERVICE = 'com.zaiken.desktop';
let keytar;

function nativeStore() {
  if (!keytar) keytar = require('keytar');
  return keytar;
}

async function saveRefreshToken(accountId, token) {
  if (!accountId || !token) throw new Error('Account ID and refresh token are required.');
  await nativeStore().setPassword(SERVICE, `refresh:${accountId}`, token);
}

async function getRefreshToken(accountId) {
  if (!accountId) return null;
  return nativeStore().getPassword(SERVICE, `refresh:${accountId}`);
}

async function removeRefreshToken(accountId) {
  if (!accountId) return false;
  return nativeStore().deletePassword(SERVICE, `refresh:${accountId}`);
}

module.exports = { saveRefreshToken, getRefreshToken, removeRefreshToken };
