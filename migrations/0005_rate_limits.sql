-- Fixed-window rate limiting, keyed by IP + action + time bucket.
-- Small and self-cleaning: old buckets are swept opportunistically on write.
CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  count  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
