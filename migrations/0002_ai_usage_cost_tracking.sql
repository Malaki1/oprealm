ALTER TABLE ai_usage ADD COLUMN provider TEXT DEFAULT 'openai';
ALTER TABLE ai_usage ADD COLUMN model TEXT;
ALTER TABLE ai_usage ADD COLUMN quality TEXT;
ALTER TABLE ai_usage ADD COLUMN provider_units REAL NOT NULL DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN estimated_cost_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN metadata_json TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_usage_tool ON ai_usage(tool);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage(provider);
