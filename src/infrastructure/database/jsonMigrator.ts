/**
 * One-shot migrator: legacy signed JSON stores → SQLite
 * Copyright © 2026 Zaid Bilal Banat
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getDb, getSqlite, initDatabase } from './client';
import { games, playSessions, profiles, achievements, aiReports, settings, users, schemaMeta } from './schema';
import { createLogger } from '../logging/Logger';
import { getSecretStore } from '../secrets/SecretStore';

const log = createLogger('database');

function readJsonStore(dataDir: string, name: string): any {
  const fp = path.join(dataDir, `${name}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (raw && raw.data !== undefined) return raw.data;
    return raw;
  } catch (e: any) {
    log.warn({ name, err: e?.message }, 'failed reading legacy store');
    return null;
  }
}

export function migrateFromJsonIfNeeded(jsonDataDir: string, sqlitePath: string): {
  migrated: boolean;
  reason?: string;
} {
  initDatabase(sqlitePath);
  const conn = getSqlite();

  const already = conn.prepare(`SELECT value FROM schema_meta WHERE key = 'migrated_from_json'`).get() as
    | { value: string }
    | undefined;
  if (already?.value === 'true') {
    return { migrated: false, reason: 'already_migrated' };
  }

  if (!fs.existsSync(jsonDataDir)) {
    seedDefaults();
    conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('migrated_from_json', 'true')`).run();
    return { migrated: false, reason: 'no_json_dir' };
  }

  // backup
  const backupDir = `${jsonDataDir}_backup_${Date.now()}`;
  try {
    fs.cpSync(jsonDataDir, backupDir, { recursive: true });
    log.info({ backupDir }, 'JSON backup created');
  } catch (e: any) {
    log.warn({ err: e?.message }, 'backup failed — continuing carefully');
  }

  const tx = conn.transaction(() => {
    const gamesData = readJsonStore(jsonDataDir, 'games') || [];
    for (const g of gamesData) {
      getDb()
        .insert(games)
        .values({
          id: g.id || randomUUID(),
          name: g.name || 'Game',
          genre: g.genre ?? null,
          exePath: g.exePath ?? null,
          coverImage: g.coverImage ?? null,
          emoji: g.emoji ?? '🎮',
          platform: g.platform || 'custom',
          steamAppId: g.steamAppId ?? null,
          logPath: g.logPath ?? null,
          notes: g.notes ?? null,
          totalMinutes: g.totalMinutes || 0,
          kills: g.kills || 0,
          deaths: g.deaths || 0,
          wins: g.wins || 0,
          losses: g.losses || 0,
          matches: g.matches || 0,
          lastPlayedAt: g.lastPlayed || null,
          addedAt: g.addedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }

    const sessionsData = readJsonStore(jsonDataDir, 'sessions') || [];
    for (const s of sessionsData) {
      getDb()
        .insert(playSessions)
        .values({
          id: s.id || randomUUID(),
          gameId: s.gameId,
          minutes: s.minutes || 0,
          kills: s.kills || 0,
          deaths: s.deaths || 0,
          wins: s.wins || 0,
          losses: s.losses || 0,
          matches: s.matches || 0,
          startedAt: null,
          endedAt: s.date || new Date().toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }

    const profile = readJsonStore(jsonDataDir, 'profile');
    if (profile) {
      getDb()
        .insert(profiles)
        .values({
          id: profile.id || randomUUID(),
          username: profile.username || 'Player',
          avatarPath: profile.avatar || null,
          rank: profile.rank || 'Bronze',
          level: profile.level || 1,
          xp: profile.xp || 0,
          xpMax: profile.xpMax || 1000,
          bio: profile.bio || null,
          country: profile.country || null,
          totalWins: profile.totalWins || 0,
          totalLosses: profile.totalLosses || 0,
          totalKills: profile.totalKills || 0,
          totalDeaths: profile.totalDeaths || 0,
          totalMatches: profile.totalMatches || 0,
          winStreak: profile.winStreak || 0,
          bestWinStreak: profile.bestWinStreak || 0,
          reactionTimeMs: profile.reactionTimeMs || 0,
          reactionSamples: profile.reactionSamples || 0,
          joinDate: profile.joinDate || new Date().toISOString(),
        })
        .onConflictDoNothing()
        .run();
    } else {
      seedDefaultProfile();
    }

    const ach = readJsonStore(jsonDataDir, 'achievements') || [];
    ach.forEach((a: any, idx: number) => {
      getDb()
        .insert(achievements)
        .values({
          id: a.id || randomUUID(),
          code: a.id || `ach_${idx}`,
          name: a.name || 'Achievement',
          description: a.desc || a.description || null,
          icon: a.icon || null,
          goal: a.goal || 1,
          progress: a.progress || 0,
          unlocked: a.unlocked ? 1 : 0,
          unlockedAt: a.unlockedAt || null,
          sortOrder: idx,
        })
        .onConflictDoNothing()
        .run();
    });

    const reports = readJsonStore(jsonDataDir, 'ai_reports') || [];
    for (const r of reports) {
      getDb()
        .insert(aiReports)
        .values({
          id: r.id || randomUUID(),
          gameName: r.gameName || r.game || null,
          title: r.title || null,
          content: r.content || r.text || '',
          provider: r.provider || null,
          model: r.model || null,
          createdAt: r.createdAt || new Date().toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }

    const s = readJsonStore(jsonDataDir, 'settings') || {};
    // strip secrets from settings before DB
    const { aiApiKey, aiAppSecret, ...safeSettings } = s;
    getDb()
      .insert(settings)
      .values({
        key: 'app',
        valueJson: JSON.stringify(safeSettings),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .run();

    // users
    const usersData = readJsonStore(jsonDataDir, 'users') || [];
    for (const u of usersData) {
      getDb()
        .insert(users)
        .values({
          id: u.id || randomUUID(),
          email: u.email,
          passwordHash: u.passwordHash,
          salt: u.salt,
        })
        .onConflictDoNothing()
        .run();
    }

    conn.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('migrated_from_json', 'true')`).run();
  });

  tx();

  // move API key to secret store asynchronously-safe sync path
  const legacySettings = readJsonStore(jsonDataDir, 'settings') || {};
  if (legacySettings.aiApiKey) {
    const store = getSecretStore();
    // init is async; fire and forget with require sync path already handled in store memory/keytar
    Promise.resolve(store.init())
      .then(() => store.set('ai.api_key', String(legacySettings.aiApiKey)))
      .then(() => log.info('migrated aiApiKey into SecretStore'))
      .catch((e) => log.warn({ err: e?.message }, 'secret migration failed'));
  }

  log.info('JSON → SQLite migration complete');
  return { migrated: true };
}

function seedDefaultProfile(): void {
  getDb()
    .insert(profiles)
    .values({
      id: randomUUID(),
      username: 'Player',
      rank: 'Bronze',
      level: 1,
      xp: 0,
      xpMax: 1000,
      joinDate: new Date().toISOString(),
    })
    .run();
}

function seedDefaults(): void {
  seedDefaultProfile();
  const defaults = [
    { code: 'headshot_king', name: 'Headshot King', description: '500 headshots total', icon: '🎯', goal: 500 },
    { code: 'first_blood', name: 'First Blood', description: 'Win your first recorded match', icon: '🏆', goal: 1 },
    { code: 'speed_demon', name: 'Speed Demon', description: 'Sub-150ms avg reaction time', icon: '⚡', goal: 1 },
    { code: 'on_fire', name: 'On Fire', description: '10-win streak', icon: '🔥', goal: 10 },
    { code: 'diamond_elite', name: 'Diamond Elite', description: 'Reach Diamond rank', icon: '💎', goal: 1 },
    { code: 'marathon', name: 'Marathon', description: '1000 hours total played', icon: '🎮', goal: 60000 },
  ];
  defaults.forEach((a, idx) => {
    getDb()
      .insert(achievements)
      .values({
        id: randomUUID(),
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        goal: a.goal,
        progress: 0,
        unlocked: 0,
        sortOrder: idx,
      })
      .run();
  });
}
