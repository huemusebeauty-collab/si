import assert from "node:assert/strict";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "../src/contracts";
import type { MarketingDomainPersistence } from "../src/marketing-persistence";
import { MarketingDomainStore } from "../src/marketing-domain-store";

class FakePersistence implements MarketingDomainPersistence {
  content: MarketingContent[] = [];
  campaigns: MarketingCampaign[] = [];
  jobs: MarketingJob[] = [];
  decisions: MarketingDecisionRecord[] = [];
  loadContent() { return Promise.resolve([...this.content]); }
  saveContent(v: MarketingContent) { this.content = [v]; return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([...this.campaigns]); }
  saveCampaign(v: MarketingCampaign) { this.campaigns = [v]; return Promise.resolve(); }
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(v: MarketingJob) { this.jobs = [v]; return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([...this.decisions]); }
  saveDecision(v: MarketingDecisionRecord) { this.decisions = [v]; return Promise.resolve(); }
  cleanupE2EDomain() { return Promise.resolve(); }
}

async function main() {
  const persistence = new FakePersistence();
  const now = new Date().toISOString();
  const target = "e2e:restart-test";
  const writer = new MarketingDomainStore(persistence);
  await writer.saveContent({ contentId: `${target}:content`, format: "post", hook: "h", body: "recovered", callToAction: "shop", status: "draft", requiresApproval: false, createdAt: now, updatedAt: now });
  await writer.saveCampaign({ campaignId: `${target}:campaign`, name: "restart", objective: "conversion", productIds: [], audience: "test", keyMessage: "recover", status: "draft", createdAt: now, updatedAt: now });
  await writer.saveJob({ jobId: `${target}:job`, jobKey: `${target}:key`, type: "restart", status: "queued", payload: { target }, retryCount: 0, maxRetries: 1, createdAt: now, updatedAt: now });
  await writer.saveDecision({ decisionId: `${target}:decision`, action: "publish_content", actor: "test", target, reason: "restart", confidence: 1, requiresApproval: false, status: "proposed", evidence: [], createdAt: now });

  const restarted = new MarketingDomainStore(persistence);
  await restarted.hydrate();
  assert.equal(restarted.getContent(`${target}:content`)?.body, "recovered");
  assert.equal(restarted.getCampaign(`${target}:campaign`)?.objective, "conversion");
  assert.equal(restarted.getJob(`${target}:job`)?.payload?.target, target);
  assert.equal(restarted.getDecision(`${target}:decision`)?.target, target);
  console.log("Restart recovery tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
