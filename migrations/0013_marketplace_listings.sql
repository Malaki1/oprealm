CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_web_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_url TEXT,
  thumbnail_url TEXT,
  tags TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  license TEXT NOT NULL DEFAULT 'personal_use',
  visibility TEXT NOT NULL DEFAULT 'pending_review',
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  approved_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_review
  ON marketplace_listings(review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type
  ON marketplace_listings(type, review_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON marketplace_listings(seller_web_user_id, created_at);
