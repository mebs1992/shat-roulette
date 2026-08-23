-- Last time the app was open, so presence can tell "around" from "gone".
-- shitting_since already covers the third state.
ALTER TABLE users ADD COLUMN last_seen INTEGER;
CREATE INDEX users_last_seen ON users(last_seen);
