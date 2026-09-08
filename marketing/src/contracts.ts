export type MarketingJobStatus = "queued" | "running" | "succeeded" | "failed" | "stalled";

export interface MarketingJobHealth {
  jobKey: string;
  status: MarketingJobStatus;
  expectedStartAt?: string;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessfulRunAt?: string;
  nextRunAt?: string;
  retryCount: number;
  maxRetries: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SourceEvidence {
  source: string;
  capturedAt: string;
  confidence: number;
  evidence: string;
  lastVerifiedAt: string;
}

export interface MarketingDecision {
  action: string;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  evidence: SourceEvidence[];
}

export type ContentStatus = "idea" | "draft" | "qa_passed" | "approved" | "scheduled" | "published" | "rejected";
export type ContentFormat = "reel" | "story" | "short" | "post" | "carousel" | "pinterest" | "whatsapp" | "blog" | "website_banner" | "ad";

export interface MarketingContent {
  contentId: string;
  campaignId?: string;
  format: ContentFormat;
  title?: string;
  hook: string;
  body: string;
  callToAction: string;
  status: ContentStatus;
  platform?: string;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CampaignObjective = "awareness" | "engagement" | "traffic" | "conversion" | "retention" | "b2b";
export type CampaignStatus = "draft" | "planned" | "active" | "paused" | "completed" | "cancelled";

export interface MarketingCampaign {
  campaignId: string;
  name: string;
  objective: CampaignObjective;
  productIds: string[];
  audience: string;
  keyMessage: string;
  offer?: string;
  startAt?: string;
  endAt?: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingJob {
  jobId: string;
  jobKey: string;
  type: string;
  status: MarketingJobStatus;
  payload: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketingDecisionStatus = "proposed" | "approved" | "rejected" | "executed" | "failed" | "cancelled";

export interface MarketingDecisionRecord {
  decisionId: string;
  action: string;
  actor: string;
  target?: string;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  status: MarketingDecisionStatus;
  evidence: SourceEvidence[];
  approvalRequestId?: string;
  createdAt: string;
  decidedAt?: string;
  executedAt?: string;
  errorMessage?: string;
}
