CREATE TABLE IF NOT EXISTS shared_lists (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_shared_lists_expires_at_ms
  ON shared_lists (expires_at_ms);
