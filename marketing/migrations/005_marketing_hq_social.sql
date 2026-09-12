CREATE TABLE IF NOT EXISTS marketing_hq_social_accounts (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  automation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS marketing_hq_social_queue (
  post_id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  format TEXT NOT NULL,
  text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  approval_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_social_queue_status_scheduled
  ON marketing_hq_social_queue (status, scheduled_at);

CREATE TABLE IF NOT EXISTS marketing_hq_social_audit (
  audit_id TEXT PRIMARY KEY,
  post_id TEXT,
  account_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_social_audit_occurred
  ON marketing_hq_social_audit (occurred_at);
