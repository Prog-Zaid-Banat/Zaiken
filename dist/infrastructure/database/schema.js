"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaMeta = exports.secretRefs = exports.settings = exports.logHashes = exports.aiReports = exports.achievements = exports.playSessions = exports.games = exports.profiles = exports.authSession = exports.users = void 0;
/**
 * Drizzle schema for Zaiken
 * Copyright © 2026 Zaid Bilal Banat
 */
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    email: (0, sqlite_core_1.text)('email').notNull().unique(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    salt: (0, sqlite_core_1.text)('salt').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.authSession = (0, sqlite_core_1.sqliteTable)('auth_session', {
    id: (0, sqlite_core_1.integer)('id').primaryKey().default(1),
    currentUserId: (0, sqlite_core_1.text)('current_user_id').references(() => exports.users.id, { onDelete: 'set null' }),
});
exports.profiles = (0, sqlite_core_1.sqliteTable)('profiles', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    username: (0, sqlite_core_1.text)('username').notNull().default('Player'),
    avatarPath: (0, sqlite_core_1.text)('avatar_path'),
    rank: (0, sqlite_core_1.text)('rank').notNull().default('Bronze'),
    level: (0, sqlite_core_1.integer)('level').notNull().default(1),
    xp: (0, sqlite_core_1.integer)('xp').notNull().default(0),
    xpMax: (0, sqlite_core_1.integer)('xp_max').notNull().default(1000),
    bio: (0, sqlite_core_1.text)('bio'),
    country: (0, sqlite_core_1.text)('country'),
    totalWins: (0, sqlite_core_1.integer)('total_wins').notNull().default(0),
    totalLosses: (0, sqlite_core_1.integer)('total_losses').notNull().default(0),
    totalKills: (0, sqlite_core_1.integer)('total_kills').notNull().default(0),
    totalDeaths: (0, sqlite_core_1.integer)('total_deaths').notNull().default(0),
    totalMatches: (0, sqlite_core_1.integer)('total_matches').notNull().default(0),
    winStreak: (0, sqlite_core_1.integer)('win_streak').notNull().default(0),
    bestWinStreak: (0, sqlite_core_1.integer)('best_win_streak').notNull().default(0),
    reactionTimeMs: (0, sqlite_core_1.real)('reaction_time_ms').notNull().default(0),
    reactionSamples: (0, sqlite_core_1.integer)('reaction_samples').notNull().default(0),
    joinDate: (0, sqlite_core_1.text)('join_date').notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.games = (0, sqlite_core_1.sqliteTable)('games', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    genre: (0, sqlite_core_1.text)('genre'),
    exePath: (0, sqlite_core_1.text)('exe_path'),
    coverImage: (0, sqlite_core_1.text)('cover_image'),
    emoji: (0, sqlite_core_1.text)('emoji').default('🎮'),
    platform: (0, sqlite_core_1.text)('platform').notNull().default('custom'),
    steamAppId: (0, sqlite_core_1.text)('steam_app_id'),
    logPath: (0, sqlite_core_1.text)('log_path'),
    notes: (0, sqlite_core_1.text)('notes'),
    totalMinutes: (0, sqlite_core_1.integer)('total_minutes').notNull().default(0),
    kills: (0, sqlite_core_1.integer)('kills').notNull().default(0),
    deaths: (0, sqlite_core_1.integer)('deaths').notNull().default(0),
    wins: (0, sqlite_core_1.integer)('wins').notNull().default(0),
    losses: (0, sqlite_core_1.integer)('losses').notNull().default(0),
    matches: (0, sqlite_core_1.integer)('matches').notNull().default(0),
    lastPlayedAt: (0, sqlite_core_1.text)('last_played_at'),
    addedAt: (0, sqlite_core_1.text)('added_at').notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.playSessions = (0, sqlite_core_1.sqliteTable)('play_sessions', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    gameId: (0, sqlite_core_1.text)('game_id')
        .notNull()
        .references(() => exports.games.id, { onDelete: 'cascade' }),
    minutes: (0, sqlite_core_1.integer)('minutes').notNull(),
    kills: (0, sqlite_core_1.integer)('kills').default(0),
    deaths: (0, sqlite_core_1.integer)('deaths').default(0),
    wins: (0, sqlite_core_1.integer)('wins').default(0),
    losses: (0, sqlite_core_1.integer)('losses').default(0),
    matches: (0, sqlite_core_1.integer)('matches').default(0),
    startedAt: (0, sqlite_core_1.text)('started_at'),
    endedAt: (0, sqlite_core_1.text)('ended_at').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.achievements = (0, sqlite_core_1.sqliteTable)('achievements', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    code: (0, sqlite_core_1.text)('code').notNull().unique(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    icon: (0, sqlite_core_1.text)('icon'),
    goal: (0, sqlite_core_1.integer)('goal').notNull(),
    progress: (0, sqlite_core_1.integer)('progress').notNull().default(0),
    unlocked: (0, sqlite_core_1.integer)('unlocked').notNull().default(0),
    unlockedAt: (0, sqlite_core_1.text)('unlocked_at'),
    sortOrder: (0, sqlite_core_1.integer)('sort_order').notNull().default(0),
});
exports.aiReports = (0, sqlite_core_1.sqliteTable)('ai_reports', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    gameName: (0, sqlite_core_1.text)('game_name'),
    title: (0, sqlite_core_1.text)('title'),
    content: (0, sqlite_core_1.text)('content').notNull(),
    provider: (0, sqlite_core_1.text)('provider'),
    model: (0, sqlite_core_1.text)('model'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.logHashes = (0, sqlite_core_1.sqliteTable)('log_hashes', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    gameId: (0, sqlite_core_1.text)('game_id').references(() => exports.games.id, { onDelete: 'cascade' }),
    path: (0, sqlite_core_1.text)('path').notNull(),
    hash: (0, sqlite_core_1.text)('hash').notNull(),
    size: (0, sqlite_core_1.integer)('size').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
    key: (0, sqlite_core_1.text)('key').primaryKey(),
    valueJson: (0, sqlite_core_1.text)('value_json').notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.secretRefs = (0, sqlite_core_1.sqliteTable)('secret_refs', {
    key: (0, sqlite_core_1.text)('key').primaryKey(),
    backend: (0, sqlite_core_1.text)('backend').notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.schemaMeta = (0, sqlite_core_1.sqliteTable)('schema_meta', {
    key: (0, sqlite_core_1.text)('key').primaryKey(),
    value: (0, sqlite_core_1.text)('value').notNull(),
});
