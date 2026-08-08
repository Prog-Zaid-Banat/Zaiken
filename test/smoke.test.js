// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
// Minimal smoke tests for the local (non-Electron) modules.
// Run with: npm test
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../src/main/database');
const auth = require('../src/main/services/auth');

let passed = 0;
function ok(label) { passed++; console.log(`  ✓ ${label}`); }

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zaiken-smoke-'));
  db.init(tmp);

  // --- database basics ---
  const game = db.addGame({ name: 'Test Game', genre: 'FPS' });
  assert.ok(game.id, 'game should get an id');
  ok('db.addGame creates a game with an id');

  const sess = db.addSession(game.id, 30, { kills: 5, wins: 1 });
  assert.ok(sess.session && sess.session.minutes === 30);
  const stats = db.getStats(game.id);
  assert.strictEqual(stats.totalMinutes, 30);
  ok('db.addSession + db.getStats track playtime');
  assert.ok(Array.isArray(db.evaluateAchievements()));
  ok('db.evaluateAchievements returns array');

  const updated = db.updateGame(game.id, { name: 'Renamed' });
  assert.strictEqual(updated.name, 'Renamed');
  ok('db.updateGame updates fields');

  assert.strictEqual(db.deleteGame(game.id), true);
  assert.strictEqual(db.getGames().length, 0);
  ok('db.deleteGame removes the game');

  // --- local auth (no Firebase) ---
  const user = await auth.register('smoke@test.com', 'password123');
  assert.ok(user.uid);
  ok('auth.register creates a local user');

  await assert.rejects(() => auth.register('smoke@test.com', 'password123'));
  ok('auth.register rejects duplicate emails');

  await assert.rejects(() => auth.login('smoke@test.com', 'wrongpass'));
  ok('auth.login rejects wrong password');

  const logged = await auth.login('smoke@test.com', 'password123');
  assert.strictEqual(logged.uid, user.uid);
  ok('auth.login succeeds with correct password');

  const current = await auth.getCurrentUser();
  assert.strictEqual(current.uid, user.uid);
  ok('auth.getCurrentUser returns the persisted session');

  await auth.logout();
  assert.strictEqual(await auth.getCurrentUser(), null);
  ok('auth.logout clears the session');

  await assert.rejects(() => auth.register('bad-email', '123456'));
  ok('auth.register rejects invalid emails');

  await assert.rejects(() => auth.register('ok@test.com', '123'));
  ok('auth.register rejects short passwords');

  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${passed} checks passed.`);
}

run().catch(e => {
  console.error('\n✗ SMOKE TESTS FAILED:', e.message);
  process.exit(1);
});
