import assert from "node:assert/strict";
import { MarketingDomainStore } from "../src/marketing-domain-store";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "../src/contracts";
import type { MarketingDomainPersistence } from "../src/marketing-persistence";

class FakeDomainPersistence implements MarketingDomainPersistence {
  content: MarketingContent[] = [];
  campaigns: MarketingCampaign[] = [];
  jobs: MarketingJob[] = [];
  decisions: MarketingDecisionRecord[] = [];
  loadContent() { return Promise.resolve([...this.content]); }
  saveContent(item: MarketingContent) { this.content = [item]; return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([...this.campaigns]); }
  saveCampaign(item: MarketingCampaign) { this.campaigns = [item]; return Promise.resolve(); }
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(item: MarketingJob) { this.jobs = [item]; return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([...this.decisions]); }
  saveDecision(item: MarketingDecisionRecord) { this.decisions = [item]; return Promise.resolve(); }
}

const now = new Date().toISOString();
const persistence = new FakeDomainPersistence();
const store = new MarketingDomainStore(persistence);

const content: MarketingContent = { contentId: "content_test", format: "post", hook: "Hook", body: "Body", callToAction: "Shop", status: "draft", requiresApproval: false, createdAt: now, updatedAt: now };
const campaign: MarketingCampaign = { campaignId: "campaign_test", name: "Test", objective: "conversion", productIds: ["p1"], audience: "test", keyMessage: "message", status: "draft", createdAt: now, updatedAt: now };
const job: MarketingJob = { jobId: "job_test", jobKey: "test-key", type: "test", status: "queued", payload: { ok: true }, retryCount: 0, maxRetries: 2, createdAt: now, updatedAt: now };
const decision: MarketingDecisionRecord = { decisionId: "decision_test", action: "publish_content", actor: "test", reason: "test", confidence: 0.9, requiresApproval: true, status: "proposed", evidence: [], createdAt: now };

await store.saveContent(content);
await store.saveCampaign(campaign);
await store.saveJob(job);
await store.saveDecision(decision);
assert.deepEqual(store.summary(), { content: 1, campaigns: 1, jobs: 1, decisions: 1 });

const recovered = new MarketingDomainStore(persistence);
await recovered.hydrate();
assert.equal(recovered.getContent("content_test")?.body, "Body");
assert.equal(recovered.getCampaign("campaign_test")?.objective, "conversion");
assert.equal(recovered.getJob("job_test")?.retryCount, 0);
assert.equal(recovered.getDecision("decision_test")?.confidence, 0.9);

console.log("Marketing domain store tests passed");
