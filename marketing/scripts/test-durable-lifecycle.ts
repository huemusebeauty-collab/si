import assert from "node:assert/strict";
import { MarketingControlApi } from "../src/marketing-control-api";
import { MarketingDomainStore } from "../src/marketing-domain-store";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "../src/contracts";
import type { MarketingDomainPersistence } from "../src/marketing-persistence";

class FakePersistence implements MarketingDomainPersistence {
  content: MarketingContent[] = [];
  campaigns: MarketingCampaign[] = [];
  jobs: MarketingJob[] = [];
  decisions: MarketingDecisionRecord[] = [];
  loadContent() { return Promise.resolve([...this.content]); }
  saveContent(item: MarketingContent) { this.content = [item, ...this.content.filter((current) => current.contentId !== item.contentId)]; return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([...this.campaigns]); }
  saveCampaign(item: MarketingCampaign) { this.campaigns = [item, ...this.campaigns.filter((current) => current.campaignId !== item.campaignId)]; return Promise.resolve(); }
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(item: MarketingJob) { this.jobs = [item, ...this.jobs.filter((current) => current.jobId !== item.jobId)]; return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([...this.decisions]); }
  saveDecision(item: MarketingDecisionRecord) { this.decisions = [item, ...this.decisions.filter((current) => current.decisionId !== item.decisionId)]; return Promise.resolve(); }
  cleanupE2EDomain() { return Promise.resolve(); }
}

class FakeApprovalPersistence {
  approvals: any[] = [];
  audit: any[] = [];
  loadApprovals() { return Promise.resolve([...this.approvals]); }
  loadAudit() { return Promise.resolve([...this.audit]); }
  saveApproval(item: any) { this.approvals = [item, ...this.approvals.filter((current) => current.requestId !== item.requestId)]; return Promise.resolve(); }
  saveAudit(item: any) { this.audit.push(item); return Promise.resolve(); }
  cleanupE2E() { return Promise.resolve(); }
}

async function main() {
  const domainPersistence = new FakePersistence();
  const approvalPersistence = new FakeApprovalPersistence();
  const persistence = Object.assign(domainPersistence, approvalPersistence);
  const store = new MarketingDomainStore(persistence);
  const api = new MarketingControlApi(undefined, new (require("../src/marketing-security").MarketingSecurityLayer)(persistence), store);
  const result = await api.prepareDirectorActionDurable({ action: "launch_ads", reason: "Durable lifecycle test", confidence: 0.88, requiresApproval: true, evidence: [], target: "campaign:test" });
  assert.equal(result.ok, true);
  assert.equal(result.data?.status, "approval_required");
  assert.ok(result.data?.decisionId);
  assert.ok(result.data?.approvalRequestId);
  const proposed = store.getDecision(result.data!.decisionId!);
  assert.equal(proposed?.status, "proposed");
  assert.equal(proposed?.approvalRequestId, result.data?.approvalRequestId);

  const approved = await api.decideApprovalDurable(result.data!.approvalRequestId!, "approved", "test");
  assert.equal(approved.ok, true);
  const decided = store.getDecision(result.data!.decisionId!);
  assert.equal(decided?.status, "approved");
  assert.ok(decided?.decidedAt);
  assert.equal(store.summary().decisions, 1);
  console.log("Durable lifecycle integration tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
