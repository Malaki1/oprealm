CREATE TABLE IF NOT EXISTS audio_library_sessions (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audio_library_sessions_user ON audio_library_sessions(discord_user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_audio_library_sessions_expires ON audio_library_sessions(expires_at);
