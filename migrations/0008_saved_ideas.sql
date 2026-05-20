CREATE TABLE IF NOT EXISTS saved_ideas (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  source_result_id TEXT,
  title TEXT NOT NULL DEFAULT 'Saved Idea',
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_ideas_owner ON saved_ideas(discord_user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_source_result ON saved_ideas(source_result_id);
