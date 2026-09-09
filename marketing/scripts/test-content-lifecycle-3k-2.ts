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
  const api = new MarketingDomainApi(new MarketingDomainStore(new FakePersistence()));
  const created = await api.create("content", {
    contentId: "e2e:3k-2-content",
    format: "post",
    hook: "3K-2 hook",
    body: "3K-2 body",
    callToAction: "Review",
    status: "draft",
    requiresApproval: true,
  });
  assert.equal(created.ok, true);
  assert.equal(created.data?.status, "draft");

  const edited = await api.editContent("e2e:3k-2-content", { title: "Edited title", body: "Edited body" });
  assert.equal(edited.ok, true);
  assert.equal(edited.data?.title, "Edited title");
  assert.equal(edited.data?.body, "Edited body");
  assert.equal(edited.data?.status, "draft");

  assert.equal((await api.updateStatus("content", "e2e:3k-2-content", "qa_passed")).ok, true);
  assert.equal((await api.updateStatus("content", "e2e:3k-2-content", "approved")).ok, true);
  assert.equal((await api.updateStatus("content", "e2e:3k-2-content", "scheduled")).ok, true);
  assert.equal((await api.updateStatus("content", "e2e:3k-2-content", "published")).ok, true);

  const invalid = await api.updateStatus("content", "e2e:3k-2-content", "draft");
  assert.equal(invalid.ok, false, "published content cannot move backwards");

  const immutable = await api.editContent("e2e:3k-2-content", { title: "must fail" });
  assert.equal(immutable.ok, false, "published content cannot be edited in-place");

  assert.equal((await api.updateStatus("content", "missing-3k-2", "draft")).ok, false);
  console.log("3K-2 content lifecycle tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
