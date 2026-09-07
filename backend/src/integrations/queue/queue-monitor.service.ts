import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "./queue.constants";

// Sprint 5.8 — Worker monitoring. Surfaces per-queue counts (waiting/
// active/completed/failed/delayed) for the operations runbook / a
// future admin dashboard — read-only, no queue mutation here.
@Injectable()
export class QueueMonitorService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_RETRY) private readonly webhookRetryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MEDIA_PROCESSING) private readonly mediaQueue: Queue,
  ) {}

  private async summarize(queue: Queue) {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    return { name: queue.name, ...counts };
  }

  async getAllQueueStats() {
    return Promise.all(
      [this.emailQueue, this.smsQueue, this.webhookRetryQueue, this.mediaQueue].map((q) => this.summarize(q)),
    );
  }

  // Sprint 5.8 — dead-letter handling: BullMQ's own "failed" job list
  // (after all retry attempts are exhausted) IS the dead-letter queue
  // for Sprint 5's purposes — no separate physical queue is created,
  // since BullMQ already retains failed jobs with their full error
  // history (`removeOnFail: false` in queue.module.ts). This method
  // exposes that list per-queue for inspection/manual retry.
  async getDeadLetterJobs(queueName: string) {
    const queue = [this.emailQueue, this.smsQueue, this.webhookRetryQueue, this.mediaQueue].find(
      (q) => q.name === queueName,
    );
    if (!queue) return [];
    const failed = await queue.getFailed();
    return failed.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    }));
  }
}
