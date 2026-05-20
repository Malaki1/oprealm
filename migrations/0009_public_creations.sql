CREATE TABLE IF NOT EXISTS public_creations (
  id TEXT PRIMARY KEY,
  owner_discord_user_id TEXT,
  guild_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  media_url TEXT,
  thumbnail_url TEXT,
  tags TEXT,
  age_band TEXT,
  project_snapshot_json TEXT,
  visibility TEXT NOT NULL DEFAULT 'pending_review',
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  approved_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_public_creations_review_status
  ON public_creations(review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_public_creations_type
  ON public_creations(type, review_status);
