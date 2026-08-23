-- One row per shit. Durations and counts only; nothing about what was said.
CREATE TABLE shit_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  shitmates   INTEGER NOT NULL DEFAULT 0,
  messages    INTEGER NOT NULL DEFAULT 0,
  country     TEXT
);
CREATE INDEX shit_sessions_user ON shit_sessions(user_id, started_at);

-- Countries encountered, for the profile and the leaderboard.
CREATE TABLE countries_met (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country  TEXT NOT NULL,
  met_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, country)
);
