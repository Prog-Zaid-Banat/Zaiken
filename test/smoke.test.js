// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
// Minimal smoke tests for the modern (TypeScript) runtime stack.
// Run with: npm test
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initDatabase, closeDatabase } = require('../dist/infrastructure/database/client');
const { DatabaseConnection } = require('../dist/infrastructure/database/DatabaseConnection');
const { MigrationRunner } = require('../dist/infrastructure/database/MigrationRunner');
const { setDatabase } = require('../dist/main/ipc/databaseProvider');
const { setGameRepository } = require('../dist/main/ipc/repositoryProvider');
const { SqliteGameRepository } = require('../dist/infrastructure/database/repositories/SqliteGameRepository');
const { SqliteSessionRepository } = require('../dist/infrastructure/database/repositories/SqliteSessionRepository');
const authService = require('../dist/main/services/auth.js').default;

let passed = 0;
function ok(label) { passed++; console.log(`  ✓ ${label}`); }

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zaiken-smoke-'));
  const dbPath = path.join(tmp, 'zaiken.db');

  initDatabase(dbPath);
  const conn = new DatabaseConnection();
  conn.initialize(dbPath);
  new MigrationRunner(conn.getConnection()).run();
  setDatabase(conn);
  setGameRepository(new SqliteGameRepository());

  // --- local auth (modern scrypt service) ---
  const user = await authService.register('smoke@test.com', 'password123');
  assert.ok(user.uid);
  ok('auth.register creates a local user');

  await assert.rejects(() => authService.register('smoke@test.com', 'password123'));
  ok('auth.register rejects duplicate emails');

  await assert.rejects(() => authService.login('smoke@test.com', 'wrongpass'));
  ok('auth.login rejects wrong password');

  const logged = await authService.login('smoke@test.com', 'password123');
  assert.strictEqual(logged.uid, user.uid);
  ok('auth.login succeeds with correct password');

  const current = await authService.getCurrentUser();
  assert.strictEqual(current.uid, user.uid);
  ok('auth.getCurrentUser returns the persisted session');

  await authService.logout();
  assert.strictEqual(await authService.getCurrentUser(), null);
  ok('auth.logout clears the session');

  await assert.rejects(() => authService.register('bad-email', '123456'));
  ok('auth.register rejects invalid emails');

  await assert.rejects(() => authService.register('ok@test.com', '123'));
  ok('auth.register rejects short passwords');

  // --- modern game + session persistence ---
  const gameRepo = new SqliteGameRepository();
  const game = await gameRepo.add({ name: 'Test Game', genre: 'FPS' });
  assert.ok(game.id, 'game should get an id');
  ok('game.add creates a game with an id');

  const sessionRepo = new SqliteSessionRepository();
  await sessionRepo.add({ gameId: game.id, minutes: 30, kills: 5, wins: 1, endedAt: new Date().toISOString() });
  const stats = await gameRepo.findById(game.id);
  assert.strictEqual(stats.totalMinutes, 30);
  assert.strictEqual(stats.wins, 1);
  ok('session.add + game aggregate track playtime');

  const updated = await gameRepo.update(game.id, { name: 'Renamed' });
  assert.strictEqual(updated.name, 'Renamed');
  ok('game.update updates fields');

  const deleted = await gameRepo.delete(game.id);
  assert.strictEqual(deleted, true);
  assert.strictEqual((await gameRepo.findAll()).length, 0);
  ok('game.delete removes the game');

  conn.close();
  closeDatabase();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${passed} checks passed.`);
}

run().catch((e) => {
  console.error('\n✗ SMOKE TESTS FAILED:', e.message);
  process.exit(1);
});
