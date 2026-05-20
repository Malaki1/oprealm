CREATE TABLE IF NOT EXISTS web_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_email TEXT,
  age_band TEXT,
  tier TEXT NOT NULL DEFAULT 'explorer',
  credits_remaining INTEGER NOT NULL DEFAULT 50,
  email_verified INTEGER NOT NULL DEFAULT 0,
  safety_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_web_users_tier ON web_users(tier);

CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  web_user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (web_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(web_user_id);
CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  web_user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (web_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(web_user_id);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  web_user_id TEXT,
  provider TEXT NOT NULL,
  tier TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  amount_cents INTEGER,
  currency TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(web_user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider_reference ON billing_events(provider, provider_reference);
