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
        const parsed = JSON.parse(event.rawBody) as {
          id?: string;
          type?: string;
          data?: { object?: { id?: string } };
          providerReference?: string;
        };
        const providerReference = parsed.data?.object?.id ?? parsed.providerReference;

        // Stripe sends payment_intent.succeeded/payment_intent.payment_failed
        // (and cancellation) events. We deliberately re-fetch the PaymentIntent
        // from Stripe rather than trusting status fields in the webhook body.
        // This makes the provider API the source of truth and keeps processing
        // safe under duplicate/out-of-order deliveries.
        if (
          providerReference &&
          (parsed.type === "payment_intent.succeeded" ||
            parsed.type === "payment_intent.payment_failed" ||
            parsed.type === "payment_intent.canceled" ||
            parsed.type === undefined)
        ) {
          await this.payments.syncStatus(providerReference);
        }
      }

      event.status = "processed";
      event.processingError = undefined;
      await this.events.save(event);
    } catch (error) {
      event.status = "failed";
      event.processingError = error instanceof Error ? error.message : String(error);
      await this.events.save(event);
      throw error;
    }
  }
}
