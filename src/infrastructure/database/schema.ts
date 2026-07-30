/**
 * Drizzle schema for Zaiken
 * Copyright © 2026 Zaid Bilal Banat
 */
import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const authSession = sqliteTable('auth_session', {
  id: integer('id').primaryKey().default(1),
  currentUserId: text('current_user_id').references(() => users.id, { onDelete: 'set null' }),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: text('username').notNull().default('Player'),
  avatarPath: text('avatar_path'),
  rank: text('rank').notNull().default('Bronze'),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  xpMax: integer('xp_max').notNull().default(1000),
  bio: text('bio'),
  country: text('country'),
  totalWins: integer('total_wins').notNull().default(0),
  totalLosses: integer('total_losses').notNull().default(0),
  totalKills: integer('total_kills').notNull().default(0),
  totalDeaths: integer('total_deaths').notNull().default(0),
  totalMatches: integer('total_matches').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bestWinStreak: integer('best_win_streak').notNull().default(0),
  reactionTimeMs: real('reaction_time_ms').notNull().default(0),
  reactionSamples: integer('reaction_samples').notNull().default(0),
  joinDate: text('join_date').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  genre: text('genre'),
  exePath: text('exe_path'),
  coverImage: text('cover_image'),
  emoji: text('emoji').default('🎮'),
  platform: text('platform').notNull().default('custom'),
  steamAppId: text('steam_app_id'),
  logPath: text('log_path'),
  notes: text('notes'),
  totalMinutes: integer('total_minutes').notNull().default(0),
  kills: integer('kills').notNull().default(0),
  deaths: integer('deaths').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  matches: integer('matches').notNull().default(0),
  lastPlayedAt: text('last_played_at'),
  addedAt: text('added_at').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const playSessions = sqliteTable('play_sessions', {
  id: text('id').primaryKey(),
  gameId: text('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  minutes: integer('minutes').notNull(),
  kills: integer('kills').default(0),
  deaths: integer('deaths').default(0),
  wins: integer('wins').default(0),
  losses: integer('losses').default(0),
  matches: integer('matches').default(0),
  startedAt: text('started_at'),
  endedAt: text('ended_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  goal: integer('goal').notNull(),
  progress: integer('progress').notNull().default(0),
  unlocked: integer('unlocked').notNull().default(0),
  unlockedAt: text('unlocked_at'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const aiReports = sqliteTable('ai_reports', {
  id: text('id').primaryKey(),
  gameName: text('game_name'),
  title: text('title'),
  content: text('content').notNull(),
  provider: text('provider'),
  model: text('model'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const logHashes = sqliteTable('log_hashes', {
  id: text('id').primaryKey(),
  gameId: text('game_id').references(() => games.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  hash: text('hash').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const secretRefs = sqliteTable('secret_refs', {
  key: text('key').primaryKey(),
  backend: text('backend').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const schemaMeta = sqliteTable('schema_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
