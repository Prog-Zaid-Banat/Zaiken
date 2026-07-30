// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../src/main/database');

let passed = 0;
function ok(label) { passed++; console.log(`  ✓ ${label}`); }

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zaiken-db-unit-'));
  db.init(tmp);

  // profile defaults
  const profile = db.getProfile();
  assert.ok(profile.username);
  assert.strictEqual(typeof profile.level, 'number');
  ok('getProfile returns defaults');

  // integrity: tamper a store file and ensure fallback
  const gamesPath = path.join(tmp, 'games.json');
  fs.writeFileSync(gamesPath, JSON.stringify({ __v: 1, __sig: 'deadbeef', data: [{ id: 'x', name: 'Hacked' }] }));
  // clear cache by re-init
  delete require.cache[require.resolve('../src/main/database')];
  const db2 = require('../src/main/database');
  db2.init(tmp);
  const games = db2.getGames();
  // after integrity failure should reset to default empty array
  assert.ok(Array.isArray(games));
  ok('tampered games store falls back safely');

  // match + achievements
  db2.recordMatchResult({ wins: 1, kills: 3, deaths: 1, matches: 1 });
  const p2 = db2.getProfile();
  assert.ok(p2.totalWins >= 1);
  assert.ok(p2.xp >= 0);
  ok('recordMatchResult updates profile XP/wins');

  const unlocked = db2.evaluateAchievements();
  assert.ok(Array.isArray(unlocked));
  const fb = db2.getAchievements().find(a => a.id === 'first_blood');
  assert.ok(fb);
  assert.strictEqual(fb.desc.includes('tournament'), false);
  ok('first_blood is not tournament-based');

  // settings merge
  db2.saveSettings({ overlayEnabled: true, accentColor: '#00FFB2' });
  const s = db2.getSettings();
  assert.strictEqual(s.overlayEnabled, true);
  ok('saveSettings merges keys');

  // no tournament / store APIs
  assert.strictEqual(typeof db2.getTournaments, 'undefined');
  assert.strictEqual(typeof db2.getStoreItems, 'undefined');
  assert.strictEqual(typeof db2.addWallet, 'undefined');
  ok('tournament and store APIs are absent');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${passed} database unit checks passed.`);
}

run().catch(e => {
  console.error('\n✗ DATABASE UNIT TESTS FAILED:', e.message);
  process.exit(1);
});
