import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import type { Job } from "bullmq";
import { EMAIL_PROVIDER, type EmailProvider, type SendEmailInput } from "@/integrations/email/email-provider.interface";
import { QUEUE_NAMES } from "../queue.constants";
import { ResilientCallService } from "@/integrations/common/resilient-call.service";

// Sprint 5.8 — the actual worker for the "email" queue. BullMQ's own
// retry/backoff (configured as defaultJobOptions in queue.module.ts)
// handles queue-level retries; ResilientCallService additionally wraps
// the provider call itself with a timeout + circuit breaker, so a
// completely unresponsive email provider fails fast within a single
// job attempt rather than hanging until BullMQ's own job timeout.
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly resilientCall: ResilientCallService,
  ) {
    super();
  }

  async process(job: Job<SendEmailInput>): Promise<void> {
    await this.resilientCall.execute(
      { provider: this.provider.name, operation: "sendEmail", timeoutMs: 10_000, retry: { maxAttempts: 1 } }, // BullMQ owns cross-attempt retry; this timeout is per-attempt only
      () => this.provider.send(job.data),
    );
  }
}
