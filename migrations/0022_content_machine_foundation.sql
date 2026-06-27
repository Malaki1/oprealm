CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'business',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

CREATE TABLE IF NOT EXISTS friend_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'friend',
  token_grant_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by_user_id TEXT NOT NULL,
  accepted_by_user_id TEXT,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (invited_by_user_id) REFERENCES web_users(id),
  FOREIGN KEY (accepted_by_user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_friend_invites_workspace ON friend_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_friend_invites_email_status ON friend_invites(email, status);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id TEXT,
  media_job_id TEXT,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES web_users(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id, visibility);
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);

CREATE TABLE IF NOT EXISTS token_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  reserved_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES web_users(id)
);

CREATE TABLE IF NOT EXISTS token_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  amount_reserved INTEGER NOT NULL,
  amount_spent INTEGER NOT NULL DEFAULT 0,
  amount_released INTEGER NOT NULL DEFAULT 0,
  amount_refunded INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES web_users(id),
  FOREIGN KEY (wallet_id) REFERENCES token_wallets(id)
);

CREATE INDEX IF NOT EXISTS idx_token_reservations_user ON token_reservations(user_id, status);

CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reserved_balance_after INTEGER NOT NULL,
  related_reservation_id TEXT,
  related_media_job_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES web_users(id),
  FOREIGN KEY (wallet_id) REFERENCES token_wallets(id),
  FOREIGN KEY (related_reservation_id) REFERENCES token_reservations(id)
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type, created_at);

CREATE TABLE IF NOT EXISTS token_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO token_packs (id, name, tokens, price_cents, currency, active, metadata_json, created_at, updated_at)
VALUES
  ('starter-1000', 'Starter 1,000', 1000, 1900, 'AUD', 1, '{"phase":"foundation"}', datetime('now'), datetime('now')),
  ('growth-5000', 'Growth 5,000', 5000, 7900, 'AUD', 1, '{"phase":"foundation"}', datetime('now'), datetime('now')),
  ('studio-12000', 'Studio 12,000', 12000, 14900, 'AUD', 1, '{"phase":"foundation"}', datetime('now'), datetime('now'));
