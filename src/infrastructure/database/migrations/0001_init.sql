PRAGMA foreign_keys = ON;


-- =========================
-- USERS
-- =========================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


-- =========================
-- AUTH SESSION
-- =========================

CREATE TABLE IF NOT EXISTS auth_session (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    current_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);


INSERT OR IGNORE INTO auth_session
(id, current_user_id)
VALUES
(1, NULL);



-- =========================
-- PROFILES
-- =========================

CREATE TABLE IF NOT EXISTS profiles (

    id TEXT PRIMARY KEY NOT NULL,

    user_id TEXT REFERENCES users(id)
    ON DELETE SET NULL,

    username TEXT NOT NULL DEFAULT 'Player',

    avatar_path TEXT,

    rank TEXT NOT NULL DEFAULT 'Bronze',

    level INTEGER NOT NULL DEFAULT 1
    CHECK(level > 0),

    xp INTEGER NOT NULL DEFAULT 0
    CHECK(xp >= 0),

    xp_max INTEGER NOT NULL DEFAULT 1000
    CHECK(xp_max > 0),


    bio TEXT,

    country TEXT,


    total_wins INTEGER NOT NULL DEFAULT 0,

    total_losses INTEGER NOT NULL DEFAULT 0,

    total_kills INTEGER NOT NULL DEFAULT 0,

    total_deaths INTEGER NOT NULL DEFAULT 0,

    total_matches INTEGER NOT NULL DEFAULT 0,


    win_streak INTEGER NOT NULL DEFAULT 0,

    best_win_streak INTEGER NOT NULL DEFAULT 0,


    reaction_time_ms REAL NOT NULL DEFAULT 0,

    reaction_samples INTEGER NOT NULL DEFAULT 0,


    join_date TEXT NOT NULL,

    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);



-- =========================
-- GAMES
-- =========================

CREATE TABLE IF NOT EXISTS games (

    id TEXT PRIMARY KEY NOT NULL,


    name TEXT NOT NULL,


    genre TEXT,


    exe_path TEXT,


    cover_image TEXT,


    emoji TEXT DEFAULT '🎮',


    platform TEXT NOT NULL DEFAULT 'custom',


    steam_app_id TEXT,


    log_path TEXT,


    notes TEXT,


    total_minutes INTEGER NOT NULL DEFAULT 0,

    kills INTEGER NOT NULL DEFAULT 0,

    deaths INTEGER NOT NULL DEFAULT 0,

    wins INTEGER NOT NULL DEFAULT 0,

    losses INTEGER NOT NULL DEFAULT 0,

    matches INTEGER NOT NULL DEFAULT 0,


    last_played_at TEXT,


    added_at TEXT NOT NULL,


    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);



CREATE INDEX IF NOT EXISTS idx_games_platform
ON games(platform);


CREATE INDEX IF NOT EXISTS idx_games_last_played
ON games(last_played_at);



-- =========================
-- PLAY SESSIONS
-- =========================

CREATE TABLE IF NOT EXISTS play_sessions (

    id TEXT PRIMARY KEY NOT NULL,


    game_id TEXT NOT NULL
    REFERENCES games(id)
    ON DELETE CASCADE,


    minutes INTEGER NOT NULL
    CHECK(minutes >= 0),


    kills INTEGER DEFAULT 0,

    deaths INTEGER DEFAULT 0,

    wins INTEGER DEFAULT 0,

    losses INTEGER DEFAULT 0,

    matches INTEGER DEFAULT 0,


    started_at TEXT,

    ended_at TEXT NOT NULL,


    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);



CREATE INDEX IF NOT EXISTS idx_sessions_game
ON play_sessions(game_id);


CREATE INDEX IF NOT EXISTS idx_sessions_ended
ON play_sessions(ended_at);



-- =========================
-- ACHIEVEMENTS
-- =========================

CREATE TABLE IF NOT EXISTS achievements (

    id TEXT PRIMARY KEY NOT NULL,


    code TEXT NOT NULL UNIQUE,


    name TEXT NOT NULL,


    description TEXT,


    icon TEXT,


    goal INTEGER NOT NULL,


    progress INTEGER NOT NULL DEFAULT 0,


    unlocked INTEGER NOT NULL DEFAULT 0
    CHECK(unlocked IN (0,1)),


    unlocked_at TEXT,


    sort_order INTEGER NOT NULL DEFAULT 0
);



-- =========================
-- AI REPORTS
-- =========================

CREATE TABLE IF NOT EXISTS ai_reports (

    id TEXT PRIMARY KEY NOT NULL,


    game_name TEXT,


    title TEXT,


    content TEXT NOT NULL,


    provider TEXT,


    model TEXT,


    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);



CREATE INDEX IF NOT EXISTS idx_ai_reports_created
ON ai_reports(created_at);



-- =========================
-- LOG HASHES
-- =========================

CREATE TABLE IF NOT EXISTS log_hashes (

    id TEXT PRIMARY KEY NOT NULL,


    game_id TEXT REFERENCES games(id)
    ON DELETE CASCADE,


    path TEXT NOT NULL,


    hash TEXT NOT NULL,


    size INTEGER NOT NULL,


    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);



-- =========================
-- SETTINGS
-- =========================

CREATE TABLE IF NOT EXISTS settings (

    key TEXT PRIMARY KEY NOT NULL,


    value_json TEXT NOT NULL,


    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);



-- =========================
-- SECRET REFERENCES
-- =========================

CREATE TABLE IF NOT EXISTS secret_refs (

    key TEXT PRIMARY KEY NOT NULL,


    backend TEXT NOT NULL,


    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);



-- =========================
-- SYNC OUTBOX
-- =========================
-- جاهز للمستقبل مع Supabase/PostgreSQL


CREATE TABLE IF NOT EXISTS sync_outbox (

    id TEXT PRIMARY KEY NOT NULL,


    entity_type TEXT NOT NULL,


    entity_id TEXT NOT NULL,


    operation TEXT NOT NULL
    CHECK(operation IN ('upsert','delete')),


    payload TEXT NOT NULL,


    occurred_at TEXT NOT NULL DEFAULT (datetime('now')),


    attempts INTEGER NOT NULL DEFAULT 0,


    last_error TEXT,


    delivered_at TEXT
);



CREATE INDEX IF NOT EXISTS idx_sync_pending
ON sync_outbox(delivered_at, occurred_at);



-- =========================
-- SEED META
-- =========================

CREATE TABLE IF NOT EXISTS schema_meta (

    key TEXT PRIMARY KEY NOT NULL,

    value TEXT NOT NULL
);


INSERT OR IGNORE INTO schema_meta
(key,value)
VALUES
('version','1');
