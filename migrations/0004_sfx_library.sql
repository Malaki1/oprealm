CREATE TABLE IF NOT EXISTS sfx_assets (
  id TEXT PRIMARY KEY,
  owner_discord_user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  mood TEXT,
  course TEXT,
  age_band TEXT,
  r2_key TEXT,
  discord_attachment_url TEXT,
  duration_seconds REAL,
  file_size INTEGER,
  visibility TEXT NOT NULL DEFAULT 'private',
  review_status TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  approved_at TEXT,
  approved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_sfx_assets_owner ON sfx_assets(owner_discord_user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_sfx_assets_review ON sfx_assets(review_status, visibility);
CREATE INDEX IF NOT EXISTS idx_sfx_assets_category ON sfx_assets(category);
CREATE INDEX IF NOT EXISTS idx_sfx_assets_created_at ON sfx_assets(created_at);
