import assert from "node:assert/strict";
import { MarketingDomainApi } from "../src/marketing-domain-api";
import { MarketingDomainStore } from "../src/marketing-domain-store";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "../src/contracts";
import type { MarketingDomainPersistence } from "../src/marketing-persistence";

class FakePersistence implements MarketingDomainPersistence {
  content: MarketingContent[] = [];
  campaigns: MarketingCampaign[] = [];
  jobs: MarketingJob[] = [];
  decisions: MarketingDecisionRecord[] = [];
  loadContent() { return Promise.resolve([...this.content]); }
  saveContent(item: MarketingContent) { this.content = [item, ...this.content.filter((x) => x.contentId !== item.contentId)]; return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([...this.campaigns]); }
  saveCampaign(item: MarketingCampaign) { this.campaigns = [item, ...this.campaigns.filter((x) => x.campaignId !== item.campaignId)]; return Promise.resolve(); }
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(item: MarketingJob) { this.jobs = [item, ...this.jobs.filter((x) => x.jobId !== item.jobId)]; return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([...this.decisions]); }
  saveDecision(item: MarketingDecisionRecord) { this.decisions = [item, ...this.decisions.filter((x) => x.decisionId !== item.decisionId)]; return Promise.resolve(); }
  cleanupE2EDomain() { return Promise.resolve(); }
}

async function main() {
  const persistence = new FakePersistence();
  const store = new MarketingDomainStore(persistence);
  const api = new MarketingDomainApi(store);

  const campaign = await api.create("campaigns", {
    campaignId: "campaign_api_test",
    name: "API Test Campaign",
    objective: "conversion",
    productIds: ["p1"],
    audience: "test audience",
    keyMessage: "test message",
  });
  assert.equal(campaign.ok, true);
  assert.equal(api.get("campaigns", "campaign_api_test").ok, true);

  const content = await api.create("content", {
    contentId: "content_api_test",
    format: "post",
    hook: "Test hook",
    body: "Test body",
    callToAction: "Shop now",
    status: "draft",
    requiresApproval: false,
  });
  assert.equal(content.ok, true);
  assert.equal((await api.updateStatus("content", "content_api_test", "approved")).ok, true);

  const job = await api.create("jobs", {
    jobId: "job_api_test",
    jobKey: "api-test-job",
    type: "content_publish",
    status: "queued",
    payload: { source: "test" },
    maxRetries: 2,
  });
  assert.equal(job.ok, true);
  assert.equal((await api.updateStatus("jobs", "job_api_test", "succeeded")).ok, true);

  const decision = await api.create("decisions", {
    decisionId: "decision_api_test",
    action: "publish_content",
    actor: "test",
    reason: "API test",
    confidence: 0.9,
    requiresApproval: false,
    status: "proposed",
    evidence: [],
  });
  assert.equal(decision.ok, true);
  assert.equal((await api.updateStatus("decisions", "decision_api_test", "executed")).ok, true);

  assert.deepEqual(store.summary(), { content: 1, campaigns: 1, jobs: 1, decisions: 1 });
  assert.equal(api.get("content", "missing").ok, false);
  console.log("Marketing domain API tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
