-- Shitty Friends.
--
-- One row per direction, so a friendship is two rows once accepted. Requests
-- start as a single 'pending' row from the asker.
CREATE TABLE friendships (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX friendships_friend ON friendships(friend_id, status);

-- Presence. Set when a shit starts, cleared when it ends, so friends can see
-- who is in there right now without the lobby needing a database.
ALTER TABLE users ADD COLUMN shitting_since INTEGER;
