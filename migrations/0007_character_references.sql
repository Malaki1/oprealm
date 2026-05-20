CREATE TABLE IF NOT EXISTS character_references (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  source_result_id TEXT,
  name TEXT NOT NULL DEFAULT 'Saved Character',
  character_bible TEXT NOT NULL,
  attachment_url TEXT,
  attachment_filename TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_character_references_owner ON character_references(discord_user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_character_references_source_result ON character_references(source_result_id);
