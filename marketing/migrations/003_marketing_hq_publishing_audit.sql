CREATE TABLE IF NOT EXISTS marketing_hq_publishing_audit (
  audit_id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_hq_publishing_audit_content
  ON marketing_hq_publishing_audit (content_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_marketing_hq_publishing_audit_version
  ON marketing_hq_publishing_audit (version_id);
