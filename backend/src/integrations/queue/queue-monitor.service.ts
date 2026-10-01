import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "./queue.constants";

const QUEUE_OPERATION_TIMEOUT_MS = 2500;

function withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ServiceUnavailableException(message)), QUEUE_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

@Injectable()
export class QueueMonitorService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_RETRY) private readonly webhookRetryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MEDIA_PROCESSING) private readonly mediaQueue: Queue,
  ) {}

  private getQueue(queueName: string): Queue | undefined {
    return [this.emailQueue, this.smsQueue, this.webhookRetryQueue, this.mediaQueue].find(
      (q) => q.name === queueName,
    );
  }

  private async summarize(queue: Queue) {
    try {
      const counts = await withTimeout(
        queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
        "Queue backend did not respond in time.",
      );
      return { name: queue.name, ...counts, available: true as const };
    } catch (error) {
      return {
        name: queue.name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        available: false as const,
        error: error instanceof Error ? error.message : "Queue backend unavailable.",
      };
    }
  }

  async getAllQueueStats() {
    return Promise.all(
      [this.emailQueue, this.smsQueue, this.webhookRetryQueue, this.mediaQueue].map((q) => this.summarize(q)),
    );
  }

  async getDeadLetterJobs(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) return [];

    const failed = await withTimeout(
      queue.getFailed(),
      "Queue backend did not respond in time.",
    );
    return failed.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    }));
  }

  async retryDeadLetterJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new BadRequestException("Unknown queue.");
    }

    const job = await withTimeout(
      queue.getJob(jobId),
      "Queue backend did not respond in time.",
    );
    if (!job) {
      throw new BadRequestException("Job not found.");
    }

    const failed = await withTimeout(
      job.isFailed(),
      "Queue backend did not respond in time.",
    );
    if (failed) {
      await withTimeout(
        job.retry(),
        "Queue backend did not respond in time.",
      );
      return { retried: true, queue: queue.name, jobId: job.id };
    }

    throw new BadRequestException("Only failed jobs can be retried.");
  }
}
