"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration001InitialSchema = migration001InitialSchema;
function migration001InitialSchema(db) {
    db.exec(`

    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS app_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_user_id TEXT REFERENCES users(id)
        ON DELETE SET NULL
    );


    INSERT OR IGNORE INTO app_session
    (id, current_user_id)
    VALUES (1, NULL);


    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        rank TEXT NOT NULL DEFAULT 'Bronze',

        level INTEGER NOT NULL DEFAULT 1
        CHECK(level > 0),

        xp INTEGER NOT NULL DEFAULT 0
        CHECK(xp >= 0),

        xp_max INTEGER NOT NULL DEFAULT 1000
        CHECK(xp_max > 0),

        wallet INTEGER NOT NULL DEFAULT 0
        CHECK(wallet >= 0),

        join_date TEXT NOT NULL,

        bio TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT '',

        total_wins INTEGER NOT NULL DEFAULT 0,
        total_losses INTEGER NOT NULL DEFAULT 0,

        total_kills INTEGER NOT NULL DEFAULT 0,
        total_deaths INTEGER NOT NULL DEFAULT 0,

        total_matches INTEGER NOT NULL DEFAULT 0,

        win_streak INTEGER NOT NULL DEFAULT 0,
        best_win_streak INTEGER NOT NULL DEFAULT 0,

        reaction_time_ms REAL NOT NULL DEFAULT 0,
        reaction_samples INTEGER NOT NULL DEFAULT 0,

        updated_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,

        app_id TEXT,

        name TEXT NOT NULL,
        genre TEXT NOT NULL DEFAULT 'Unknown',

        executable_path TEXT NOT NULL DEFAULT '',
        cover_image TEXT NOT NULL DEFAULT '',

        emoji TEXT NOT NULL DEFAULT '🎮',

        platform TEXT NOT NULL DEFAULT 'custom',

        notes TEXT NOT NULL DEFAULT '',
        log_path TEXT NOT NULL DEFAULT '',

        total_minutes INTEGER NOT NULL DEFAULT 0,

        kills INTEGER NOT NULL DEFAULT 0,
        deaths INTEGER NOT NULL DEFAULT 0,

        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,

        matches INTEGER NOT NULL DEFAULT 0,

        last_played_at TEXT,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        UNIQUE(platform, app_id)
    );


    CREATE INDEX IF NOT EXISTS idx_games_last_played
    ON games(last_played_at DESC);


    CREATE TABLE IF NOT EXISTS play_sessions (

        id TEXT PRIMARY KEY,

        game_id TEXT NOT NULL
        REFERENCES games(id)
        ON DELETE CASCADE,


        minutes INTEGER NOT NULL,

        kills INTEGER NOT NULL DEFAULT 0,
        deaths INTEGER NOT NULL DEFAULT 0,

        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,

        matches INTEGER NOT NULL DEFAULT 0,


        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,

        created_at TEXT NOT NULL
    );


    CREATE INDEX IF NOT EXISTS idx_sessions_game_ended
    ON play_sessions(game_id, ended_at DESC);


    CREATE INDEX IF NOT EXISTS idx_sessions_ended
    ON play_sessions(ended_at DESC);

    `);
}
