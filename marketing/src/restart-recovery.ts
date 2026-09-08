import { randomUUID } from "node:crypto";
import type { MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob } from "./contracts";
import type { MarketingDomainPersistence } from "./marketing-persistence";
import { MarketingDomainStore } from "./marketing-domain-store";

export async function verifyRestartRecovery(persistence: MarketingDomainPersistence) {
  const id = randomUUID();
  const target = `e2e:${id}`;
  const now = new Date().toISOString();
  const contentId = `${target}:content`;
  const campaignId = `${target}:campaign`;
  const jobId = `${target}:job`;
  const decisionId = `${target}:decision`;

  try {
    const writer = new MarketingDomainStore(persistence);
    const content: MarketingContent = { contentId, campaignId, format: "post", title: "Restart recovery test", hook: "Recovery hook", body: "Recovery body", callToAction: "Verify", status: "draft", requiresApproval: false, createdAt: now, updatedAt: now };
    const campaign: MarketingCampaign = { campaignId, name: "Restart recovery test", objective: "conversion", productIds: ["e2e-product"], audience: "e2e", keyMessage: "Recovery message", status: "draft", createdAt: now, updatedAt: now };
    const job: MarketingJob = { jobId, jobKey: `${target}:job-key`, type: "restart-recovery", status: "queued", payload: { target }, retryCount: 0, maxRetries: 2, createdAt: now, updatedAt: now };
    const decision: MarketingDecisionRecord = { decisionId, action: "publish_content", actor: "e2e", target, reason: "Restart recovery verification", confidence: 1, requiresApproval: false, status: "proposed", evidence: [{ source: "restart-recovery", capturedAt: now, confidence: 1, evidence: "Persist before simulated restart", lastVerifiedAt: now }], createdAt: now };

    await writer.saveContent(content);
    await writer.saveCampaign(campaign);
    await writer.saveJob(job);
    await writer.saveDecision(decision);

    // A fresh store represents a clean process after restart. It has no in-memory state
    // until hydration reconstructs the domain state from durable Neon storage.
    const restarted = new MarketingDomainStore(persistence);
    await restarted.hydrate();

    const recovered = {
      content: restarted.getContent(contentId),
      campaign: restarted.getCampaign(campaignId),
      job: restarted.getJob(jobId),
      decision: restarted.getDecision(decisionId),
    };
    const verified = Boolean(
      recovered.content?.body === content.body &&
      recovered.campaign?.objective === campaign.objective &&
      recovered.job?.payload?.target === target &&
      recovered.decision?.target === target,
    );
    if (!verified) throw new Error("Restart recovery did not reconstruct all durable domain records");

    return { ok: true, test: "restart-recovery", verified: { content: true, campaign: true, job: true, decision: true, freshHydration: true }, cleanedUp: false, target };
  } finally {
    const cleanup = (persistence as { cleanupE2EDomain?: (target: string) => Promise<void> }).cleanupE2EDomain;
    if (cleanup) await cleanup.call(persistence, target);
  }
}
