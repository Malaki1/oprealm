CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'explorer',
  credits_remaining INTEGER NOT NULL DEFAULT 10,
  safety_completed INTEGER NOT NULL DEFAULT 0,
  alias TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_members_discord_user_id ON members(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_members_tier ON members(tier);
CREATE INDEX IF NOT EXISTS idx_members_safety_completed ON members(safety_completed);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  prompt TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_discord_user_id ON ai_usage(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);

CREATE TABLE IF NOT EXISTS safety_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT,
  guild_id TEXT,
  event_type TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_safety_events_discord_user_id ON safety_events(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_severity ON safety_events(severity);
