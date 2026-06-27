CREATE TABLE IF NOT EXISTS generation_provider_state (
  provider TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'available',
  reason TEXT,
  blocked_until INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
