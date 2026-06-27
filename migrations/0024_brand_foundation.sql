-- Phase 3: Brand foundation runtime tables.

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  business_type TEXT,
  product_or_service TEXT,
  offer TEXT,
  primary_cta TEXT,
  target_audience TEXT,
  tone_of_voice TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  brand_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_brands_workspace_status ON brands(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_brands_created_by_user ON brands(created_by_user_id);

CREATE TABLE IF NOT EXISTS brand_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  asset_id TEXT,
  title TEXT,
  raw_text TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (created_by_user_id) REFERENCES web_users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE INDEX IF NOT EXISTS idx_brand_sources_brand_status ON brand_sources(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_brand_sources_workspace ON brand_sources(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_brand_sources_asset ON brand_sources(asset_id);

CREATE TABLE IF NOT EXISTS brand_brains (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  brand_id TEXT NOT NULL UNIQUE,
  brain_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE INDEX IF NOT EXISTS idx_brand_brains_workspace ON brand_brains(workspace_id);
