// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
// Modern (TypeScript) database stack unit checks.
// Run with: npm test
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initDatabase, getSqlite, closeDatabase } = require('../dist/infrastructure/database/client');
const { DatabaseConnection } = require('../dist/infrastructure/database/DatabaseConnection');
const { MigrationRunner } = require('../dist/infrastructure/database/MigrationRunner');
const { setDatabase } = require('../dist/main/ipc/databaseProvider');
const { setGameRepository, getGameRepository } = require('../dist/main/ipc/repositoryProvider');
const { SqliteGameRepository } = require('../dist/infrastructure/database/repositories/SqliteGameRepository');
const { SqliteSessionRepository } = require('../dist/infrastructure/database/repositories/SqliteSessionRepository');
const { SqliteSettingsRepository } = require('../dist/infrastructure/database/repositories/SqliteSettingsRepository');
const { SqliteAchievementsRepository } = require('../dist/infrastructure/database/repositories/SqliteAchievementsRepository');
const { SqliteProfileRepository } = require('../dist/infrastructure/database/repositories/SqliteProfileRepository');
const { SqliteUserRepository } = require('../dist/infrastructure/database/repositories/SqliteUserRepository');

let passed = 0;
function ok(label) { passed++; console.log(`  ✓ ${label}`); }

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zaiken-db-unit-'));
  const dbPath = path.join(tmp, 'zaiken.db');

  initDatabase(dbPath);
  const conn = new DatabaseConnection();
  conn.initialize(dbPath);
  new MigrationRunner(conn.getConnection()).run();
  setDatabase(conn);
  setGameRepository(new SqliteGameRepository());

  // migrations applied (schema_meta version = 2, 0001 + 0002)
  const version = getSqlite().prepare("SELECT value FROM schema_meta WHERE key = 'version'").get().value;
  assert.strictEqual(version, '2');
  ok('migrations applied (schema_meta version 2)');

  // settings save/get (arbitrary keys)
  const settingsRepo = new SqliteSettingsRepository();
  const saved = settingsRepo.save({ overlayEnabled: true, accentColor: '#00FFB2', aiApiKey: 'k' });
  assert.strictEqual(saved.overlayEnabled, true);
  assert.strictEqual(saved.aiApiKey, 'k');
  ok('saveSettings persists arbitrary keys');

  const loaded = settingsRepo.getAll();
  assert.strictEqual(loaded.accentColor, '#00FFB2');
  assert.strictEqual(loaded.aiApiKey, 'k');
  ok('getSettings returns merged defaults + saved keys');

  // game CRUD
  const gameRepo = getGameRepository();
  const game = await gameRepo.add({ name: 'Test Game', genre: 'FPS' });
  assert.ok(game.id);
  ok('game add returns id');

  // session + game aggregates + profile creation
  const sessionRepo = new SqliteSessionRepository();
  await sessionRepo.add({ gameId: game.id, minutes: 30, kills: 5, wins: 1, endedAt: new Date().toISOString() });
  const gameAfter = await gameRepo.findById(game.id);
  assert.strictEqual(gameAfter.totalMinutes, 30);
  assert.strictEqual(gameAfter.wins, 1);
  assert.strictEqual(gameAfter.kills, 5);
  ok('session updates game aggregates');

  const sessions = await sessionRepo.findByGame(game.id);
  assert.strictEqual(sessions.length, 1);
  ok('findByGame returns recorded sessions');

  const daily = await sessionRepo.dailyStats(7);
  assert.strictEqual(daily.length, 7);
  ok('dailyStats returns 7 days');

  const profileRepo = new SqliteProfileRepository();
  const prof = await profileRepo.findCurrent();
  assert.ok(prof.id);
  assert.strictEqual(prof.level, 1);
  ok('profile is created with defaults');

  // achievements: seeded + evaluate unlocks first_blood after wins
  const achRepo = new SqliteAchievementsRepository();
  const all = achRepo.getAll();
  assert.ok(all.length >= 6, 'expected seeded achievements');
  ok('seeded achievements present');

  getSqlite().prepare('UPDATE profiles SET total_wins = 5').run();
  const unlocked = achRepo.evaluate();
  assert.ok(unlocked.some((a) => a.code === 'first_blood'));
  ok('evaluate unlocks first_blood after wins');

  // user repository + session row
  const userRepo = new SqliteUserRepository();
  userRepo.addUser({ id: 'u1', email: 'u@example.com', passwordHash: 'h', salt: 's' });
  const found = userRepo.findByEmail('U@EXAMPLE.COM');
  assert.ok(found && found.id === 'u1');
  ok('user repository find by email is case-insensitive');

  userRepo.setCurrentUserId('u1');
  assert.strictEqual(userRepo.getCurrentUserId(), 'u1');
  ok('auth session row tracks current user');

  conn.close();
  closeDatabase();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${passed} modern database unit checks passed.`);
}

run().catch((e) => {
  console.error('\n✗ DATABASE UNIT TESTS FAILED:', e.message);
  process.exit(1);
});
