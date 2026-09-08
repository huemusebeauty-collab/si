import { randomUUID } from "node:crypto";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "./contracts";
import { MarketingDomainStore } from "./marketing-domain-store";
import { MarketingLifecycleService } from "./marketing-lifecycle";

export type DomainKind = "content" | "campaigns" | "jobs" | "decisions";

const ok = <T>(data: T) => ({ ok: true as const, data, generatedAt: new Date().toISOString() });
const fail = (error: string) => ({ ok: false as const, error, generatedAt: new Date().toISOString() });
const requireString = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value.trim();
};
const valid = (value: string, allowed: readonly string[], field: string) => {
  if (!allowed.includes(value)) throw new Error(`${field} is invalid`);
  return value;
};

const contentStatuses = ["idea", "draft", "qa_passed", "approved", "scheduled", "published", "rejected"] as const;
const contentFormats = ["reel", "story", "short", "post", "carousel", "pinterest", "whatsapp", "blog", "website_banner", "ad"] as const;
const campaignObjectives = ["awareness", "engagement", "traffic", "conversion", "retention", "b2b"] as const;
const campaignStatuses = ["draft", "planned", "active", "paused", "completed", "cancelled"] as const;
const jobStatuses = ["queued", "running", "succeeded", "failed", "stalled"] as const;
const decisionStatuses = ["proposed", "approved", "rejected", "executed", "failed", "cancelled"] as const;

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
    const cleanId = id.trim();
    if (!cleanId) return fail("Domain id is required");
    if (kind === "content") { const item = this.store.getContent(cleanId); return item ? ok(item) : fail("Content not found"); }
    if (kind === "campaigns") { const item = this.store.getCampaign(cleanId); return item ? ok(item) : fail("Campaign not found"); }
    if (kind === "jobs") { const item = this.store.getJob(cleanId); return item ? ok(item) : fail("Job not found"); }
    const item = this.store.getDecision(cleanId); return item ? ok(item) : fail("Decision not found");
  }

  async create(kind: DomainKind, body: Record<string, unknown>) {
    try {
      if (kind === "content") {
        const item = {
          ...body,
          contentId: String(body.contentId ?? `content_${randomUUID()}`),
          format: valid(requireString(body, "format"), contentFormats, "format") as MarketingContent["format"],
          hook: requireString(body, "hook"), body: requireString(body, "body"), callToAction: requireString(body, "callToAction"),
          status: valid(String(body.status ?? "idea"), contentStatuses, "status") as MarketingContent["status"],
          requiresApproval: Boolean(body.requiresApproval),
        } as MarketingContent;
        return ok(await this.lifecycle.createContent(item));
      }
      if (kind === "campaigns") {
        const item = {
          ...body,
          campaignId: String(body.campaignId ?? `campaign_${randomUUID()}`),
          name: requireString(body, "name"), objective: valid(requireString(body, "objective"), campaignObjectives, "objective") as MarketingCampaign["objective"],
          productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : [], audience: requireString(body, "audience"), keyMessage: requireString(body, "keyMessage"),
          status: valid(String(body.status ?? "draft"), campaignStatuses, "status") as MarketingCampaign["status"],
        } as MarketingCampaign;
        return ok(await this.lifecycle.createCampaign(item));
      }
      if (kind === "jobs") {
        const item = {
          ...body,
          jobId: String(body.jobId ?? `job_${randomUUID()}`), jobKey: requireString(body, "jobKey"), type: requireString(body, "type"),
          status: valid(String(body.status ?? "queued"), jobStatuses, "status") as MarketingJob["status"], payload: body.payload && typeof body.payload === "object" ? body.payload : {},
          retryCount: typeof body.retryCount === "number" ? body.retryCount : 0, maxRetries: typeof body.maxRetries === "number" ? body.maxRetries : 0,
        } as MarketingJob;
        return ok(await this.lifecycle.createJob(item));
      }
      const item = {
        ...body,
        decisionId: String(body.decisionId ?? `decision_${randomUUID()}`), action: requireString(body, "action"), actor: requireString(body, "actor"), reason: requireString(body, "reason"),
        confidence: typeof body.confidence === "number" ? body.confidence : 0, requiresApproval: Boolean(body.requiresApproval),
        status: valid(String(body.status ?? "proposed"), decisionStatuses, "status") as MarketingDecisionRecord["status"], evidence: Array.isArray(body.evidence) ? body.evidence : [],
      } as MarketingDecisionRecord;
      return ok(await this.lifecycle.recordDecision(item));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Domain create failed");
    }
  }

  async updateStatus(kind: DomainKind, id: string, status: string, errorMessage?: string) {
    try {
      const cleanStatus = status.trim();
      if (kind === "content") return ok(await this.lifecycle.updateContent(id, valid(cleanStatus, contentStatuses, "status") as MarketingContent["status"]));
      if (kind === "campaigns") return ok(await this.lifecycle.updateCampaign(id, valid(cleanStatus, campaignStatuses, "status") as MarketingCampaign["status"]));
      if (kind === "jobs") return ok(await this.lifecycle.updateJob(id, valid(cleanStatus, jobStatuses, "status") as MarketingJob["status"], errorMessage));
      return ok(await this.lifecycle.updateDecision(id, valid(cleanStatus, decisionStatuses, "status") as MarketingDecisionRecord["status"]));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Domain status update failed");
    }
  }

  summary() { return ok(this.store.summary()); }
}
