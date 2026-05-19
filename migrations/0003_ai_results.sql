CREATE TABLE IF NOT EXISTS ai_results (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT,
  tool TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_filename TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_results_owner ON ai_results(discord_user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_created_at ON ai_results(created_at);
