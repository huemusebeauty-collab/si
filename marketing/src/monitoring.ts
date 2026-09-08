import type { MarketingJobHealth, MarketingJobStatus } from "./contracts";

export interface MonitoringAlert {
  alertId: string;
  jobKey: string;
  type: "late_start" | "stalled" | "failed" | "retry_exhausted";
  createdAt: string;
  message: string;
}

export class MarketingMonitor {
  private readonly jobs = new Map<string, MarketingJobHealth>();
  private readonly alerts: MonitoringAlert[] = [];

  register(jobKey: string, expectedStartAt?: string, maxRetries = 3): MarketingJobHealth {
    const job: MarketingJobHealth = {
      jobKey,
      status: "queued",
      expectedStartAt,
      retryCount: 0,
      maxRetries,
    };
    this.jobs.set(jobKey, job);
    return job;
  }

  markRunning(jobKey: string): MarketingJobHealth | undefined {
    return this.update(jobKey, { status: "running", startedAt: new Date().toISOString() });
  }

  markSucceeded(jobKey: string): MarketingJobHealth | undefined {
    const now = new Date().toISOString();
    return this.update(jobKey, { status: "succeeded", finishedAt: now, lastSuccessfulRunAt: now });
  }

  markFailed(jobKey: string, errorCode: string, errorMessage: string): MarketingJobHealth | undefined {
    const job = this.jobs.get(jobKey);
    if (!job) return undefined;
    const retryCount = job.retryCount + 1;
    const status: MarketingJobStatus = retryCount >= job.maxRetries ? "failed" : "queued";
    const updated = this.update(jobKey, { status, finishedAt: new Date().toISOString(), retryCount, errorCode, errorMessage });
    if (updated && retryCount >= updated.maxRetries) this.alert(jobKey, "retry_exhausted", "Maximum retry count reached");
    else this.alert(jobKey, "failed", errorMessage);
    return updated;
  }

  inspect(now = new Date()): { jobs: MarketingJobHealth[]; alerts: MonitoringAlert[] } {
    for (const job of this.jobs.values()) {
      if (job.status === "queued" && job.expectedStartAt && now > new Date(job.expectedStartAt)) {
        this.alert(job.jobKey, "late_start", "Scheduled job has not started by its expected start time");
      }
      if (job.status === "running" && job.startedAt && now.getTime() - new Date(job.startedAt).getTime() > 15 * 60 * 1000) {
        this.update(job.jobKey, { status: "stalled" });
        this.alert(job.jobKey, "stalled", "Running job exceeded the 15 minute stall threshold");
      }
    }
    return { jobs: [...this.jobs.values()], alerts: [...this.alerts] };
  }

  private update(jobKey: string, patch: Partial<MarketingJobHealth>): MarketingJobHealth | undefined {
    const current = this.jobs.get(jobKey);
    if (!current) return undefined;
    const updated = { ...current, ...patch };
    this.jobs.set(jobKey, updated);
    return updated;
  }

  private alert(jobKey: string, type: MonitoringAlert["type"], message: string) {
    const alert: MonitoringAlert = {
      alertId: `${jobKey}:${type}:${Date.now()}`,
      jobKey,
      type,
      createdAt: new Date().toISOString(),
      message,
    };
    this.alerts.push(alert);
    console.warn(`[MarketingMonitor] ${type}: ${jobKey} — ${message}`);
  }
}
