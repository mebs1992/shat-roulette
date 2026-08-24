-- A friend inviting a friend into a private chat.
-- room_id is the shared handle both sides join; possessing it (delivered only
-- via the invite) is the authorisation to enter that room.
CREATE TABLE invites (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined'))
);
CREATE INDEX invites_to ON invites(to_id, status);
