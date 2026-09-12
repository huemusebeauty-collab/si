CREATE TABLE IF NOT EXISTS marketing_hq_creators (
  creator_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  beauty_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  followers BIGINT,
  average_views BIGINT,
  engagement_rate NUMERIC,
  audience_fit_score NUMERIC,
  authenticity_score NUMERIC,
  conversion_score NUMERIC,
  creator_score NUMERIC,
  public_contact TEXT,
  status TEXT NOT NULL,
  products_sent JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_content_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue_attributed NUMERIC
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_creators_score ON marketing_hq_creators (creator_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_creators_status ON marketing_hq_creators (status);

CREATE TABLE IF NOT EXISTS marketing_hq_creator_sample_kits (
  kit_id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES marketing_hq_creators(creator_id),
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  shipment_status TEXT NOT NULL,
  tracking_reference TEXT
);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_creator_kits_creator ON marketing_hq_creator_sample_kits (creator_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hq_creator_kits_status ON marketing_hq_creator_sample_kits (shipment_status);
