// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

// Local authentication — no external service (Firebase removed).
// Passwords are never stored in plain text: they're hashed with scrypt
// (per-user random salt) and only the hash + salt are persisted locally
// via database.js (in the app's userData folder on the user's own machine).

const crypto = require('crypto');
const db = require('../database');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SCRYPT_KEYLEN = 64;

function _hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
}

function _validateCredentials(email, password) {
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

module.exports = {
  register: async (email, password) => {
    _validateCredentials(email, password);
    if (db.findUserByEmail(email)) {
      throw new Error('An account with this email already exists.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = _hashPassword(password, salt);
    const user = db.addUser({ email, passwordHash, salt });
    db.setCurrentUserId(user.id);
    return { uid: user.id, email: user.email };
  },

  login: async (email, password) => {
    _validateCredentials(email, password);
    const user = db.findUserByEmail(email);
    // Generic error on purpose (don't reveal whether the email exists).
    const genericError = () => new Error('Invalid email or password.');
    if (!user) throw genericError();

    const attemptHash = Buffer.from(_hashPassword(password, user.salt), 'hex');
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    const isValid = attemptHash.length === storedHash.length &&
      crypto.timingSafeEqual(attemptHash, storedHash);
    if (!isValid) throw genericError();

    db.setCurrentUserId(user.id);
    return { uid: user.id, email: user.email };
  },

  logout: async () => {
    db.setCurrentUserId(null);
  },

  getCurrentUser: async () => {
    const uid = db.getCurrentUserId();
    if (!uid) return null;
    const user = db.getUserById(uid);
    return user ? { uid: user.id, email: user.email } : null;
  }
};
