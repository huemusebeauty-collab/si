import assert from "node:assert/strict";
import { DurableMarketingWorker } from "../src/durable-worker";
import type { MarketingAlert, MarketingCampaign, MarketingContent, MarketingDecisionRecord, MarketingJob, MarketingJobAttempt } from "../src/contracts";
import type { MarketingDomainPersistence, MarketingPersistence } from "../src/marketing-persistence";
import type { ApprovalRequest, AuditEvent } from "../src/marketing-security";

class FakePersistence implements MarketingPersistence, MarketingDomainPersistence {
  jobs: MarketingJob[] = [];
  attempts: MarketingJobAttempt[] = [];
  alerts: MarketingAlert[] = [];
  loadJobs() { return Promise.resolve([...this.jobs]); }
  saveJob(job: MarketingJob) { this.jobs = [job, ...this.jobs.filter((item) => item.jobId !== job.jobId)]; return Promise.resolve(); }
  loadJobAttempts(jobId?: string) { return Promise.resolve(this.attempts.filter((item) => !jobId || item.jobId === jobId)); }
  saveJobAttempt(attempt: MarketingJobAttempt) { this.attempts = [attempt, ...this.attempts.filter((item) => item.attemptId !== attempt.attemptId)]; return Promise.resolve(); }
  loadAlerts(status?: MarketingAlert["status"]) { return Promise.resolve(this.alerts.filter((item) => !status || item.status === status)); }
  saveAlert(alert: MarketingAlert) { this.alerts = [alert, ...this.alerts.filter((item) => item.alertId !== alert.alertId)]; return Promise.resolve(); }
  loadContent() { return Promise.resolve([] as MarketingContent[]); }
  saveContent(_: MarketingContent) { return Promise.resolve(); }
  loadCampaigns() { return Promise.resolve([] as MarketingCampaign[]); }
  saveCampaign(_: MarketingCampaign) { return Promise.resolve(); }
  loadDecisions() { return Promise.resolve([] as MarketingDecisionRecord[]); }
  saveDecision(_: MarketingDecisionRecord) { return Promise.resolve(); }
  loadApprovals() { return Promise.resolve([] as ApprovalRequest[]); }
  saveApproval(_: ApprovalRequest) { return Promise.resolve(); }
  loadAudit() { return Promise.resolve([] as AuditEvent[]); }
  saveAudit(_: AuditEvent) { return Promise.resolve(); }
  cleanupE2E() { return Promise.resolve(); }
  cleanupE2EDomain() { return Promise.resolve(); }
}

const now = Date.parse("2026-09-11T05:30:00.000Z");
const job = (overrides: Partial<MarketingJob> = {}): MarketingJob => ({ jobId: "job:test", jobKey: "test", type: "test", status: "queued", payload: {}, retryCount: 0, maxRetries: 2, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), ...overrides });

async function main() {
  const p = new FakePersistence();
  p.jobs = [job()];
  const worker = new DurableMarketingWorker(p, p, { now: () => now });
  let calls = 0;
  worker.register("test", async () => { calls += 1; if (calls === 1) throw new Error("temporary failure"); return { evidence: "ok" }; });

  const first = await worker.runOnce();
  assert.equal(first.status, "queued");
  assert.equal(p.jobs[0].retryCount, 1);
  assert.equal(p.attempts.length, 1);
  assert.equal(p.attempts[0].status, "failed");
  assert.equal(p.alerts[0].type, "failed");

  const second = await worker.runOnce();
  assert.equal(second.status, "succeeded");
  assert.equal(p.jobs[0].status, "succeeded");
  assert.equal(p.attempts.length, 2);
  assert.equal(p.attempts[0].status, "succeeded");

  p.jobs = [job({ status: "running", startedAt: new Date(now - 16 * 60 * 1000).toISOString() })];
  const recovered = await worker.recoverStalled();
  assert.equal(recovered.recovered, 1);
  assert.equal(p.jobs[0].status, "stalled");
  assert.equal(p.alerts[0].type, "stalled");

  p.jobs = [job({ type: "unknown" })];
  const unknown = await worker.runOnce();
  assert.equal(unknown.status, "queued");
  assert.equal(p.jobs[0].status, "queued");
  assert.equal(p.attempts.length, 2);

  console.log("Durable worker tests passed");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
