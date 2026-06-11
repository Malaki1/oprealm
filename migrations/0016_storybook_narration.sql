CREATE TABLE IF NOT EXISTS storybook_audio_beats (
  id TEXT PRIMARY KEY,
  web_user_id TEXT NOT NULL,
  storybook_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  beat_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL,
  beat_number INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  delivery_direction TEXT NOT NULL DEFAULT '',
  audio_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(web_user_id, storybook_id, beat_id)
);

CREATE INDEX IF NOT EXISTS idx_storybook_audio_manifest
  ON storybook_audio_beats(web_user_id, storybook_id, scene_number, beat_number);

CREATE INDEX IF NOT EXISTS idx_storybook_audio_hash
  ON storybook_audio_beats(web_user_id, audio_hash, status);
