import { randomUUID } from "node:crypto";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "./contracts";
import { MarketingDomainStore } from "./marketing-domain-store";
import { MarketingLifecycleService } from "./marketing-lifecycle";

export type DomainKind = "content" | "campaigns" | "jobs" | "decisions";

const ok = <T>(data: T) => ({ ok: true as const, data, generatedAt: new Date().toISOString() });
const fail = (error: string) => ({ ok: false as const, error, generatedAt: new Date().toISOString() });

export class MarketingDomainApi {
  private readonly lifecycle: MarketingLifecycleService;
  constructor(private readonly store: MarketingDomainStore) {
    this.lifecycle = new MarketingLifecycleService(store);
  }

  list(kind: DomainKind) {
    if (kind === "content") return ok(this.store.listContent());
    if (kind === "campaigns") return ok(this.store.listCampaigns());
    if (kind === "jobs") return ok(this.store.listJobs());
    return ok(this.store.listDecisions());
  }

  get(kind: DomainKind, id: string) {
    if (kind === "content") return this.store.getContent(id) ? ok(this.store.getContent(id)) : fail("Content not found");
    if (kind === "campaigns") return this.store.getCampaign(id) ? ok(this.store.getCampaign(id)) : fail("Campaign not found");
    if (kind === "jobs") return this.store.getJob(id) ? ok(this.store.getJob(id)) : fail("Job not found");
    return this.store.getDecision(id) ? ok(this.store.getDecision(id)) : fail("Decision not found");
  }

  async create(kind: DomainKind, body: Record<string, unknown>) {
    try {
      if (kind === "content") {
        const item = { ...body, contentId: String(body.contentId ?? `content_${randomUUID()}`) } as unknown as Omit<MarketingContent, "createdAt" | "updatedAt">;
        return ok(await this.lifecycle.createContent(item));
      }
      if (kind === "campaigns") {
        const item = {
          ...body,
          campaignId: String(body.campaignId ?? `campaign_${randomUUID()}`),
          productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : [],
        } as unknown as Omit<MarketingCampaign, "status" | "createdAt" | "updatedAt">;
        return ok(await this.lifecycle.createCampaign(item));
      }
      if (kind === "jobs") {
        const item = { ...body, jobId: String(body.jobId ?? `job_${randomUUID()}`), payload: body.payload && typeof body.payload === "object" ? body.payload : {} } as unknown as Omit<MarketingJob, "createdAt" | "updatedAt" | "retryCount">;
        return ok(await this.lifecycle.createJob(item));
      }
      const item = { ...body, decisionId: String(body.decisionId ?? `decision_${randomUUID()}`), evidence: Array.isArray(body.evidence) ? body.evidence : [] } as unknown as Omit<MarketingDecisionRecord, "createdAt">;
      return ok(await this.lifecycle.recordDecision(item));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Domain create failed");
    }
  }

  async updateStatus(kind: DomainKind, id: string, status: string, errorMessage?: string) {
    try {
      if (kind === "content") return ok(await this.lifecycle.updateContent(id, status as MarketingContent["status"]));
      if (kind === "campaigns") return ok(await this.lifecycle.updateCampaign(id, status as MarketingCampaign["status"]));
      if (kind === "jobs") return ok(await this.lifecycle.updateJob(id, status as MarketingJob["status"], errorMessage));
      return ok(await this.lifecycle.updateDecision(id, status as MarketingDecisionRecord["status"]));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Domain status update failed");
    }
  }

  summary() { return ok(this.store.summary()); }
}
