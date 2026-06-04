CREATE TABLE IF NOT EXISTS api_request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip_hash TEXT,
  colo TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_created
ON api_request_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_path_status
ON api_request_logs(path, status);

CREATE TABLE IF NOT EXISTS api_gateway_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  route TEXT NOT NULL,
  status INTEGER,
  attempts INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_gateway_events_created
ON api_gateway_events(created_at);

CREATE INDEX IF NOT EXISTS idx_api_gateway_events_provider_route
ON api_gateway_events(provider, route);
