CREATE TABLE IF NOT EXISTS marketing_hq_job_attempts (
  attempt_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_job_attempts_job
  ON marketing_hq_job_attempts (job_id, attempt_number);

CREATE TABLE IF NOT EXISTS marketing_hq_alerts (
  alert_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  job_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_alerts_status_created
  ON marketing_hq_alerts (status, created_at DESC);
