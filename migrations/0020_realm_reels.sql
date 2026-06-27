CREATE TABLE IF NOT EXISTS realm_reels (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  template_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'quick_prompt',
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  thumbnail_url TEXT,
  preview_url TEXT,
  export_url TEXT,
  cta_type TEXT,
  cta_target_url TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_realm_reels_creator ON realm_reels(creator_id, updated_at);

CREATE TABLE IF NOT EXISTS reel_seeds (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  seed_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_decision_trees (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  tree_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_storyboard_frames (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  frame_type TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  headline_text TEXT NOT NULL,
  caption_text TEXT,
  narration_text TEXT,
  image_prompt TEXT,
  image_url TEXT,
  video_prompt TEXT,
  video_url TEXT,
  transition TEXT,
  audio_cue TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reel_frames_reel ON reel_storyboard_frames(reel_id, order_index);

CREATE TABLE IF NOT EXISTS reel_assets (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  frame_id TEXT,
  asset_type TEXT NOT NULL,
  prompt TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_exports (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  output_url TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  duration_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_analytics (
  reel_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  completion_rate REAL NOT NULL DEFAULT 0,
  click_through_rate REAL NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  exports INTEGER NOT NULL DEFAULT 0,
  story_expansions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_analytics_events (
  id TEXT PRIMARY KEY,
  reel_id TEXT,
  creator_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reel_events_reel ON reel_analytics_events(reel_id, created_at);

CREATE TABLE IF NOT EXISTS reel_ctas (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL,
  cta_type TEXT NOT NULL,
  target_url TEXT,
  tracking_code TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
