import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES, QueueName } from "./queue.constants";

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
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    return { name: queue.name, ...counts };
  }

  async getAllQueueStats() {
    return Promise.all(
      [this.emailQueue, this.smsQueue, this.webhookRetryQueue, this.mediaQueue].map((q) => this.summarize(q)),
    );
  }

  async getDeadLetterJobs(queueName: string) {
    const queue = this.getQueue(queueName);
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

  async retryDeadLetterJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new BadRequestException("Unknown queue.");
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new BadRequestException("Job not found.");
    }

    if (await job.isFailed()) {
      await job.retry();
      return { retried: true, queue: queue.name, jobId: job.id };
    }

    throw new BadRequestException("Only failed jobs can be retried.");
  }
}
