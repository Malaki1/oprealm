-- Phase 4: Brand ingestion attempt tracking.

CREATE TABLE IF NOT EXISTS brand_ingestion_attempts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  source_url TEXT,
  final_url TEXT,
  http_status INTEGER,
  content_type TEXT,
  title TEXT,
  error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (source_id) REFERENCES brand_sources(id),
  FOREIGN KEY (created_by_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_workspace_id ON brand_ingestion_attempts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_brand_id ON brand_ingestion_attempts(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_source_id ON brand_ingestion_attempts(source_id);
CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_status ON brand_ingestion_attempts(status);
CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_created_at ON brand_ingestion_attempts(created_at);

ALTER TABLE brand_sources ADD COLUMN last_ingested_at TEXT;
ALTER TABLE brand_sources ADD COLUMN last_ingestion_attempt_id TEXT;
