CREATE TABLE IF NOT EXISTS provider_generation_slots (
  provider TEXT NOT NULL,
  slot INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  lease_expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, slot)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_generation_slots_job
  ON provider_generation_slots (job_id);

