CREATE TABLE IF NOT EXISTS asset_forge_projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  progress INTEGER NOT NULL DEFAULT 0,
  source_key TEXT,
  source_name TEXT,
  source_type TEXT,
  source_width INTEGER,
  source_height INTEGER,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_asset_forge_projects_owner ON asset_forge_projects(owner_id, updated_at);

CREATE TABLE IF NOT EXISTS asset_forge_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  export_format TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background TEXT NOT NULL,
  prompt TEXT,
  negative_prompt TEXT,
  output_key TEXT,
  thumbnail_key TEXT,
  quality_json TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_asset_forge_assets_project ON asset_forge_assets(project_id, status, category);

CREATE TABLE IF NOT EXISTS asset_forge_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  asset_id TEXT,
  owner_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  error_text TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_asset_forge_jobs_project ON asset_forge_jobs(project_id, created_at);

CREATE TABLE IF NOT EXISTS asset_forge_exports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  storage_key TEXT,
  file_name TEXT,
  manifest_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
