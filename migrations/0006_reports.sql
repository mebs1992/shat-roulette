-- Reports and auto-ban.
-- One row per (reporter, reported) pair, so reporting the same person twice
-- counts once — a ban needs three DIFFERENT people.
CREATE TABLE reports (
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (reporter_id, reported_id)
);
CREATE INDEX reports_reported ON reports(reported_id);

-- Set once an account crosses the threshold. Banned accounts cannot be matched.
ALTER TABLE users ADD COLUMN banned_at INTEGER;
