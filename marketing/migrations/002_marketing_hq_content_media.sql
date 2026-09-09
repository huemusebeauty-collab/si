CREATE TABLE IF NOT EXISTS marketing_hq_content_versions (
  version_id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES marketing_hq_content(content_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  format TEXT NOT NULL,
  title TEXT,
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  call_to_action TEXT NOT NULL,
  platform TEXT,
  change_note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_content_versions_content ON marketing_hq_content_versions (content_id, version_number DESC);

CREATE TABLE IF NOT EXISTS marketing_hq_media_assets (
  media_id TEXT PRIMARY KEY,
  content_id TEXT REFERENCES marketing_hq_content(content_id) ON DELETE SET NULL,
  version_id TEXT REFERENCES marketing_hq_content_versions(version_id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 TEXT NOT NULL,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  duration_seconds NUMERIC CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_media_assets_content ON marketing_hq_media_assets (content_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_media_assets_version ON marketing_hq_media_assets (version_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_media_assets_status ON marketing_hq_media_assets (status);
