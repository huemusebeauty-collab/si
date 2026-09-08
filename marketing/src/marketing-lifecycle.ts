import type {
  CampaignStatus,
  ContentStatus,
  MarketingCampaign,
  MarketingContent,
  MarketingDecisionRecord,
  MarketingJob,
  MarketingJobStatus,
  MarketingDecisionStatus,
} from "./contracts";
import { MarketingDomainStore } from "./marketing-domain-store";

export class MarketingLifecycleService {
  constructor(private readonly store: MarketingDomainStore) {}

  async createCampaign(input: Omit<MarketingCampaign, "status" | "createdAt" | "updatedAt"> & { status?: CampaignStatus }): Promise<MarketingCampaign> {
    const now = new Date().toISOString();
    return this.store.saveCampaign({ ...input, productIds: [...input.productIds], status: input.status ?? "draft", createdAt: now, updatedAt: now });
  }

  async createContent(input: Omit<MarketingContent, "createdAt" | "updatedAt">): Promise<MarketingContent> {
    const now = new Date().toISOString();
    return this.store.saveContent({ ...input, createdAt: now, updatedAt: now });
  }

  async createJob(input: Omit<MarketingJob, "createdAt" | "updatedAt" | "retryCount"> & { retryCount?: number }): Promise<MarketingJob> {
    const now = new Date().toISOString();
    return this.store.saveJob({ ...input, retryCount: input.retryCount ?? 0, createdAt: now, updatedAt: now });
  }

  async recordDecision(input: Omit<MarketingDecisionRecord, "createdAt">): Promise<MarketingDecisionRecord> {
    return this.store.saveDecision({ ...input, createdAt: new Date().toISOString() });
  }

  async updateCampaign(campaignId: string, status: CampaignStatus): Promise<MarketingCampaign> {
    const current = this.store.getCampaign(campaignId);
    if (!current) throw new Error(`Campaign not found: ${campaignId}`);
    return this.store.saveCampaign({ ...current, status, updatedAt: new Date().toISOString() });
  }

  async updateContent(contentId: string, status: ContentStatus): Promise<MarketingContent> {
    const current = this.store.getContent(contentId);
    if (!current) throw new Error(`Content not found: ${contentId}`);
    return this.store.saveContent({ ...current, status, updatedAt: new Date().toISOString() });
  }

  async updateJob(jobId: string, status: MarketingJobStatus, errorMessage?: string): Promise<MarketingJob> {
    const current = this.store.getJob(jobId);
    if (!current) throw new Error(`Job not found: ${jobId}`);
    const now = new Date().toISOString();
    return this.store.saveJob({ ...current, status, errorMessage, startedAt: status === "running" ? current.startedAt ?? now : current.startedAt, finishedAt: ["succeeded", "failed", "stalled"].includes(status) ? now : current.finishedAt, updatedAt: now });
  }

  async updateDecision(decisionId: string, status: MarketingDecisionStatus): Promise<MarketingDecisionRecord> {
    const current = this.store.getDecision(decisionId);
    if (!current) throw new Error(`Decision not found: ${decisionId}`);
    const now = new Date().toISOString();
    return this.store.saveDecision({ ...current, status, decidedAt: ["approved", "rejected", "cancelled"].includes(status) ? now : current.decidedAt, executedAt: status === "executed" ? now : current.executedAt });
  }
}
