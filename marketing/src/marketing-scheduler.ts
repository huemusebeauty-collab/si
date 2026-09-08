export type MarketingJobStatus = "queued" | "running" | "succeeded" | "failed" | "stalled";

export interface MarketingJob {
  jobKey: string;
  scheduledAt: string;
  maxRetries: number;
  retryCount: number;
  status: MarketingJobStatus;
  startedAt?: string;
  finishedAt?: string;
  lastError?: string;
}

export interface SchedulerAlert {
  type: "late_start" | "stalled" | "failed" | "retry_exhausted";
  jobKey: string;
  message: string;
  createdAt: string;
}

export class MarketingScheduler {
  private readonly jobs = new Map<string, MarketingJob>();
  private readonly alerts: SchedulerAlert[] = [];
  private readonly stallAfterMs: number;

  constructor(stallAfterMs = 15 * 60 * 1000) {
    this.stallAfterMs = stallAfterMs;
  }

  schedule(jobKey: string, scheduledAt: string, maxRetries = 3): MarketingJob {
    const job: MarketingJob = { jobKey, scheduledAt, maxRetries, retryCount: 0, status: "queued" };
    this.jobs.set(jobKey, job);
    return job;
  }

  markRunning(jobKey: string): MarketingJob | undefined {
    const job = this.jobs.get(jobKey);
    if (!job) return undefined;
    const now = new Date().toISOString();
    if (new Date(now).getTime() > new Date(job.scheduledAt).getTime()) this.alert("late_start", jobKey, "Scheduled start time was missed.");
    const updated = { ...job, status: "running" as const, startedAt: now };
    this.jobs.set(jobKey, updated);
    return updated;
  }

  markSucceeded(jobKey: string): MarketingJob | undefined {
    const job = this.jobs.get(jobKey);
    if (!job) return undefined;
    const updated = { ...job, status: "succeeded" as const, finishedAt: new Date().toISOString() };
    this.jobs.set(jobKey, updated);
    return updated;
  }

  markFailed(jobKey: string, error: string): MarketingJob | undefined {
    const job = this.jobs.get(jobKey);
    if (!job) return undefined;
    const retryCount = job.retryCount + 1;
    const exhausted = retryCount > job.maxRetries;
    const updated = {
      ...job,
      status: exhausted ? ("failed" as const) : ("queued" as const),
      retryCount,
      lastError: error,
      finishedAt: new Date().toISOString(),
    };
    this.jobs.set(jobKey, updated);
    this.alert(exhausted ? "retry_exhausted" : "failed", jobKey, exhausted ? `Retry limit exhausted: ${error}` : `Job failed and is eligible for retry: ${error}`);
    return updated;
  }

  inspect(now = Date.now()): SchedulerAlert[] {
    for (const job of this.jobs.values()) {
      if (job.status === "running" && job.startedAt && now - new Date(job.startedAt).getTime() >= this.stallAfterMs) {
        job.status = "stalled";
        this.alert("stalled", job.jobKey, `Job has been running for at least ${Math.round(this.stallAfterMs / 60000)} minutes.`);
      }
    }
    return [...this.alerts];
  }

  status(): MarketingJob[] {
    return [...this.jobs.values()];
  }

  getAlerts(): SchedulerAlert[] {
    return [...this.alerts];
  }

  private alert(type: SchedulerAlert["type"], jobKey: string, message: string): void {
    this.alerts.push({ type, jobKey, message, createdAt: new Date().toISOString() });
  }
}
