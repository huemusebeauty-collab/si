CREATE TABLE IF NOT EXISTS marketing_hq_approvals (
  request_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','pending','rejected')),
  decided_at TIMESTAMPTZ,
  decided_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketing_hq_approvals_decision_created
  ON marketing_hq_approvals (decision, created_at DESC);

CREATE TABLE IF NOT EXISTS marketing_hq_audit_events (
  event_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  details TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_hq_audit_events_occurred
  ON marketing_hq_audit_events (occurred_at DESC);

CREATE TABLE IF NOT EXISTS marketing_hq_content (
  content_id TEXT PRIMARY KEY,
  campaign_id TEXT,
  format TEXT NOT NULL,
  title TEXT,
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  call_to_action TEXT NOT NULL,
  status TEXT NOT NULL,
  platform TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_content_campaign ON marketing_hq_content (campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_content_status ON marketing_hq_content (status);

CREATE TABLE IF NOT EXISTS marketing_hq_campaigns (
  campaign_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience TEXT NOT NULL,
  key_message TEXT NOT NULL,
  offer TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_campaigns_status ON marketing_hq_campaigns (status);

CREATE TABLE IF NOT EXISTS marketing_hq_jobs (
  job_id TEXT PRIMARY KEY,
  job_key TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_hq_jobs_job_key ON marketing_hq_jobs (job_key);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_jobs_status_scheduled ON marketing_hq_jobs (status, scheduled_at);

CREATE TABLE IF NOT EXISTS marketing_hq_decisions (
  decision_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  reason TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  requires_approval BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_decisions_status_created ON marketing_hq_decisions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_decisions_target ON marketing_hq_decisions (target);
