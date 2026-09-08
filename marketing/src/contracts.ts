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
