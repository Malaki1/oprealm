CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  user_id TEXT,
  token_pack_id TEXT,
  tokens INTEGER,
  payload_json TEXT NOT NULL,
  error_message TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_checkout_session_id
  ON stripe_webhook_events(checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_payment_intent_id
  ON stripe_webhook_events(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_user_id
  ON stripe_webhook_events(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON stripe_webhook_events(status);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
  ON stripe_webhook_events(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_transactions_unique_stripe_checkout_session
  ON token_transactions(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
