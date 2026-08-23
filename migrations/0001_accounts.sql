-- Accounts and everything that has to outlive a websocket.
-- Deliberately narrow: chat messages are never stored, and nothing here
-- identifies a person beyond what they typed in themselves.

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  -- Shown to friends. The public identity stays "Shitmate #<num>".
  username        TEXT NOT NULL UNIQUE,
  -- Stable public number, so strangers never see the username.
  shitmate_num    INTEGER NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  -- PBKDF2 (Workers has no bcrypt); null for accounts that only use Google.
  password_hash   TEXT,
  avatar          TEXT NOT NULL DEFAULT 'swirl',
  country         TEXT,
  created_at      INTEGER NOT NULL,
  -- Lifetime counters, updated when a shit ends.
  total_shits     INTEGER NOT NULL DEFAULT 0,
  total_shit_ms   INTEGER NOT NULL DEFAULT 0,
  longest_shit_ms INTEGER NOT NULL DEFAULT 0,
  total_shitmates INTEGER NOT NULL DEFAULT 0,
  streak_days     INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_shit_day   TEXT
);

CREATE TABLE oauth_identities (
  provider     TEXT NOT NULL,
  provider_id  TEXT NOT NULL,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_id)
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
