import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Job } from "bullmq";
import { QUEUE_NAMES } from "../queue.constants";
import { WebhookEventEntity } from "@/integrations/webhooks/entities/webhook-event.entity";
import { PaymentService } from "@/integrations/payment/payment.service";

interface WebhookJobData {
  eventId: string;
  category: "payment" | "shipping";
}

// Sprint 5.7/5.8 — the actual business-effect processing for a webhook,
// run asynchronously via the queue (never inline in the HTTP request —
// see WebhooksService's comment). On failure, BullMQ's own retry/backoff
// applies (queue.module.ts defaults: 5 attempts, exponential); after
// exhausting attempts the job lands in BullMQ's failed-job list — the
// dead-letter queue for this sprint's purposes (QueueMonitorService exposes it for inspection).
@Processor(QUEUE_NAMES.WEBHOOK_RETRY)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger("WebhookProcessor");

  constructor(
    @InjectRepository(WebhookEventEntity) private readonly events: Repository<WebhookEventEntity>,
    private readonly payments: PaymentService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const event = await this.events.findOne({ where: { id: job.data.eventId } });
    if (!event) {
      this.logger.warn(`Webhook event ${job.data.eventId} not found — skipping.`);
      return;
    }

    try {
      event.attemptCount += 1;

      if (job.data.category === "payment") {
        // Sprint 5.7 — Sprint 5 scope: the mock payment provider's
        // webhook payload shape is minimal (see docs/integrations/
        // WEBHOOK_SPECIFICATION.md); a real provider's actual event-type
        // parsing (e.g. Stripe's `type: "payment_intent.succeeded"`)
        // would branch here. For Sprint 5, any payment webhook triggers
        // a status re-sync against the provider reference embedded in
        // the payload, reusing PaymentService.syncStatus rather than
        // trusting the webhook body's claimed status directly (defense
        // against a malformed or stale payload — the sync call re-
        // verifies against the provider).
        const parsed = JSON.parse(event.rawBody) as { providerReference?: string };
        if (parsed.providerReference) {
          await this.payments.syncStatus(parsed.providerReference);
        }
      }
      // Sprint 5 scope: shipping webhook processing (tracking status
      // sync) follows the same shape but isn't wired to a concrete
      // downstream effect yet — Orders doesn't yet have a
      // "shipped"-from-webhook trigger distinct from the manual
      // updateStatus call. Documented in Known Issues.

      event.status = "processed";
      await this.events.save(event);
    } catch (error) {
      event.status = "failed";
      event.processingError = error instanceof Error ? error.message : String(error);
      await this.events.save(event);
      throw error; // re-throw so BullMQ counts this as a failed attempt and retries per its backoff policy
    }
  }
}
