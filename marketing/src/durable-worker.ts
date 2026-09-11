import { randomUUID } from "node:crypto";
import type { MarketingAlert, MarketingJob, MarketingJobAttempt } from "./contracts";
import type { MarketingDomainPersistence, MarketingPersistence } from "./marketing-persistence";

export type DurableJobHandler = (job: MarketingJob) => Promise<Record<string, unknown> | void>;

export interface DurableWorkerOptions {
  stallAfterMs?: number;
  now?: () => number;
}

export class DurableMarketingWorker {
  private readonly stallAfterMs: number;
  private readonly now: () => number;
  private readonly handlers = new Map<string, DurableJobHandler>();

  constructor(
    private readonly domain: MarketingDomainPersistence,
    private readonly persistence: MarketingPersistence,
    options: DurableWorkerOptions = {},
  ) {
    this.stallAfterMs = options.stallAfterMs ?? 15 * 60 * 1000;
    this.now = options.now ?? (() => Date.now());
  }

  register(type: string, handler: DurableJobHandler): void {
    this.handlers.set(type, handler);
  }

  async recoverStalled(): Promise<{ recovered: number; alerts: MarketingAlert[] }> {
    const jobs = await this.domain.loadJobs();
    const alerts: MarketingAlert[] = [];
    for (const job of jobs) {
      if (job.status !== "running" || !job.startedAt) continue;
      if (this.now() - new Date(job.startedAt).getTime() < this.stallAfterMs) continue;
      const updated = this.updatedJob(job, { status: "stalled", finishedAt: new Date(this.now()).toISOString(), errorCode: "JOB_STALLED", errorMessage: "Worker recovery detected a job exceeding the stall threshold." });
      await this.domain.saveJob(updated);
      const alert = this.makeAlert("critical", "stalled", "Job exceeded the stall threshold and was recovered as stalled.", job.jobId);
      await this.persistence.saveAlert(alert);
      alerts.push(alert);
    }
    return { recovered: alerts.length, alerts };
  }

  async runOnce(): Promise<{ processed: boolean; jobId?: string; status?: string }> {
    await this.recoverStalled();
    const jobs = await this.domain.loadJobs();
    const now = this.now();
    const job = jobs
      .filter((item) => item.status === "queued")
      .filter((item) => !item.scheduledAt || new Date(item.scheduledAt).getTime() <= now)
      .sort((a, b) => new Date(a.scheduledAt ?? a.createdAt).getTime() - new Date(b.scheduledAt ?? b.createdAt).getTime())[0];
    if (!job) return { processed: false };

    const startedAt = new Date(now).toISOString();
    const running = this.updatedJob(job, { status: "running", startedAt, errorCode: undefined, errorMessage: undefined });
    await this.domain.saveJob(running);
    const attemptNumber = job.retryCount + 1;
    const attemptBase: MarketingJobAttempt = {
      attemptId: `attempt_${randomUUID()}`,
      jobId: job.jobId,
      attemptNumber,
      status: "running",
      startedAt,
      createdAt: startedAt,
    };
    await this.persistence.saveJobAttempt(attemptBase);

    const handler = this.handlers.get(job.type);
    try {
      if (!handler) throw new Error(`No handler registered for job type: ${job.type}`);
      const evidence = await handler(job);
      const finishedAt = new Date(this.now()).toISOString();
      await this.persistence.saveJobAttempt({ ...attemptBase, status: "succeeded", finishedAt, evidence, });
      await this.domain.saveJob(this.updatedJob(running, { status: "succeeded", finishedAt }));
      return { processed: true, jobId: job.jobId, status: "succeeded" };
    } catch (error) {
      const finishedAt = new Date(this.now()).toISOString();
      const message = error instanceof Error ? error.message : String(error);
      const retryCount = job.retryCount + 1;
      const exhausted = retryCount >= job.maxRetries;
      const status = exhausted ? "failed" : "queued";
      await this.persistence.saveJobAttempt({ ...attemptBase, status: "failed", finishedAt, errorCode: "JOB_EXECUTION_FAILED", errorMessage: message });
      await this.domain.saveJob(this.updatedJob(running, { status, retryCount, finishedAt, errorCode: "JOB_EXECUTION_FAILED", errorMessage: message }));
      const alert = this.makeAlert(exhausted ? "critical" : "warning", exhausted ? "retry_exhausted" : "failed", exhausted ? `Retry limit exhausted: ${message}` : `Job failed and was queued for retry: ${message}`, job.jobId);
      await this.persistence.saveAlert(alert);
      return { processed: true, jobId: job.jobId, status };
    }
  }

  private updatedJob(job: MarketingJob, patch: Partial<MarketingJob>): MarketingJob {
    return { ...job, ...patch, updatedAt: new Date(this.now()).toISOString() };
  }

  private makeAlert(severity: MarketingAlert["severity"], type: string, message: string, jobId: string): MarketingAlert {
    return { alertId: `alert_${randomUUID()}`, severity, type, message, status: "open", jobId, createdAt: new Date(this.now()).toISOString() };
  }
}
