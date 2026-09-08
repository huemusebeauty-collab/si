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
