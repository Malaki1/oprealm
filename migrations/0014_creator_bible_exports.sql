CREATE TABLE IF NOT EXISTS creator_projects (
  id TEXT PRIMARY KEY,
  web_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_creator_projects_user
  ON creator_projects(web_user_id, updated_at);

CREATE TABLE IF NOT EXISTS creator_bibles (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  web_user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  selected_outcome TEXT NOT NULL,
  bible_json TEXT NOT NULL,
  safety_rating_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES creator_projects(id)
);

CREATE INDEX IF NOT EXISTS idx_creator_bibles_user
  ON creator_bibles(web_user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_creator_bibles_project
  ON creator_bibles(project_id, updated_at);

CREATE TABLE IF NOT EXISTS generated_assets (
  id TEXT PRIMARY KEY,
  bible_id TEXT,
  web_user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  provider TEXT,
  url TEXT,
  metadata_json TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bible_id) REFERENCES creator_bibles(id)
);

CREATE INDEX IF NOT EXISTS idx_generated_assets_bible
  ON generated_assets(bible_id, asset_type);

CREATE TABLE IF NOT EXISTS game_instances (
  id TEXT PRIMARY KEY,
  bible_id TEXT NOT NULL,
  web_user_id TEXT NOT NULL,
  outcome_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private_test',
  config_json TEXT NOT NULL,
  playable_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bible_id) REFERENCES creator_bibles(id)
);

CREATE INDEX IF NOT EXISTS idx_game_instances_user
  ON game_instances(web_user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_game_instances_outcome
  ON game_instances(outcome_type, status);

CREATE TABLE IF NOT EXISTS media_exports (
  id TEXT PRIMARY KEY,
  bible_id TEXT NOT NULL,
  web_user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  url TEXT,
  manifest_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bible_id) REFERENCES creator_bibles(id)
);

CREATE INDEX IF NOT EXISTS idx_media_exports_bible
  ON media_exports(bible_id, export_type);

CREATE TABLE IF NOT EXISTS safety_reports (
  id TEXT PRIMARY KEY,
  bible_id TEXT,
  web_user_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  reason TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bible_id) REFERENCES creator_bibles(id)
);

CREATE INDEX IF NOT EXISTS idx_safety_reports_bible
  ON safety_reports(bible_id, severity);

CREATE TABLE IF NOT EXISTS public_shares (
  id TEXT PRIMARY KEY,
  game_instance_id TEXT NOT NULL,
  web_user_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  approval_status TEXT NOT NULL DEFAULT 'pending_review',
  library_slug TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_instance_id) REFERENCES game_instances(id)
);

CREATE INDEX IF NOT EXISTS idx_public_shares_status
  ON public_shares(approval_status, visibility);
