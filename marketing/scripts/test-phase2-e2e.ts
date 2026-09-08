import assert from "node:assert/strict";
import { MarketingDomainApi } from "../src/marketing-domain-api";
import { MarketingDomainStore } from "../src/marketing-domain-store";
import { MarketingLifecycleService } from "../src/marketing-lifecycle";
import { MarketingSecurityLayer } from "../src/marketing-security";
import type { MarketingDomainPersistence } from "../src/marketing-persistence";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "../src/contracts";
import type { ApprovalRequest, AuditEvent } from "../src/marketing-security";

class FakePersistence implements MarketingDomainPersistence {
  content: MarketingContent[] = [];
  campaigns: MarketingCampaign[] = [];
  jobs: MarketingJob[] = [];
  decisions: MarketingDecisionRecord[] = [];
  approvals: ApprovalRequest[] = [];
  audit: AuditEvent[] = [];
  loadContent() { return Promise.resolve([...this.content]); }
  saveContent(x: MarketingContent) { this.content = [x, ...this.content.filter((v) => v.contentId !== x.contentId)]; return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([...this.campaigns]); }
  saveCampaign(x: MarketingCampaign) { this.campaigns = [x, ...this.campaigns.filter((v) => v.campaignId !== x.campaignId)]; return Promise.resolve(); }
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(x: MarketingJob) { this.jobs = [x, ...this.jobs.filter((v) => v.jobId !== x.jobId)]; return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([...this.decisions]); }
  saveDecision(x: MarketingDecisionRecord) { this.decisions = [x, ...this.decisions.filter((v) => v.decisionId !== x.decisionId)]; return Promise.resolve(); }
  cleanupE2EDomain() { return Promise.resolve(); }
  loadApprovals() { return Promise.resolve([...this.approvals]); }
  saveApproval(x: ApprovalRequest) { this.approvals = [x, ...this.approvals.filter((v) => v.requestId !== x.requestId)]; return Promise.resolve(); }
  loadAudit() { return Promise.resolve([...this.audit]); }
  saveAudit(x: AuditEvent) { this.audit = [...this.audit, x]; return Promise.resolve(); }
  cleanupE2E() { return Promise.resolve(); }
}

async function main() {
  const persistence = new FakePersistence();
  const store = new MarketingDomainStore(persistence);
  const lifecycle = new MarketingLifecycleService(store);
  const api = new MarketingDomainApi(store);

  const campaign = await api.create("campaigns", { campaignId: "phase2_campaign", name: "Phase 2 E2E", objective: "conversion", productIds: ["p1"], audience: "test", keyMessage: "test" });
  const content = await api.create("content", { contentId: "phase2_content", format: "post", hook: "hook", body: "body", callToAction: "shop", status: "draft", requiresApproval: false });
  const job = await api.create("jobs", { jobId: "phase2_job", jobKey: "phase2-job", type: "content_publish", status: "queued", payload: {}, maxRetries: 2 });
  assert.equal(campaign.ok && content.ok && job.ok, true);

  const decision = await lifecycle.recordDecision({ decisionId: "phase2_decision", action: "publish_content", actor: "e2e", target: "phase2_content", reason: "Phase 2 E2E", confidence: 0.95, requiresApproval: true, status: "proposed", evidence: [] });
  assert.equal(decision.status, "proposed");

  const hydratedStore = new MarketingDomainStore(persistence);
  await hydratedStore.hydrate();
  assert.ok(hydratedStore.getCampaign("phase2_campaign"));
  assert.ok(hydratedStore.getContent("phase2_content"));
  assert.ok(hydratedStore.getJob("phase2_job"));
  assert.equal(hydratedStore.getDecision("phase2_decision")?.status, "proposed");

  const security = new MarketingSecurityLayer(persistence);
  const approval = await security.requestApproval({ requestId: "phase2_approval", action: "publish_content", actor: "e2e", target: "phase2_content", reason: "Phase 2 approval" });
  await security.flushPersistence();
  const approved = security.decideApproval(approval.requestId, "approved", "e2e");
  await security.flushPersistence();
  const freshSecurity = new MarketingSecurityLayer(persistence);
  await freshSecurity.hydrate();
  assert.equal(freshSecurity.listApprovals().find((x) => x.requestId === approval.requestId)?.decision, "approved");
  assert.ok(freshSecurity.listAudit().length >= 2);
  assert.equal(freshSecurity.canExecute("publish_content", approval.requestId), true);

  console.log("Phase 2 final persistent core E2E gate passed");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
