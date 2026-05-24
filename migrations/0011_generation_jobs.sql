CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  web_user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  prompt_hash TEXT NOT NULL,
  idempotency_key TEXT,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  quality TEXT,
  result_json TEXT,
  error TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_tool_created
  ON generation_jobs (web_user_id, tool, created_at);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_prompt_cache
  ON generation_jobs (web_user_id, tool, prompt_hash, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_idempotency
  ON generation_jobs (web_user_id, tool, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
