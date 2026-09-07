import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { WebhookEventEntity } from "./entities/webhook-event.entity";
import { QUEUE_NAMES } from "@/integrations/queue/queue.constants";
import { IntegrationLoggerService } from "@/integrations/common/integration-logger.service";
import type { PaymentProvider } from "@/integrations/payment/payment-provider.interface";
import type { ShippingProvider } from "@/integrations/shipping/shipping-provider.interface";

// Sprint 5.7 — Webhook Framework. WebhooksController is the thin HTTP
// layer; this service owns signature verification, replay protection,
// audit logging, and enqueueing for async processing (never processes
// the event's business effect inline in the HTTP request — a slow or
// failing downstream effect must never make the webhook endpoint itself
// slow or cause the provider to see a timeout and redeliver
// unnecessarily).
@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEventEntity) private readonly events: Repository<WebhookEventEntity>,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_RETRY) private readonly webhookQueue: Queue,
    private readonly logger: IntegrationLoggerService,
  ) {}

  // Sprint 5.7 — receives a verified, deduplicated webhook and queues it
  // for processing. Returns "duplicate": true rather than throwing, so
  // the controller can still respond 200 to the provider (per every
  // major provider's own guidance: a duplicate delivery should still be
  // ack'd 2xx, or the provider will keep redelivering it forever).
  async receive(
    provider: PaymentProvider | ShippingProvider,
    category: "payment" | "shipping",
    rawBody: string,
    signatureHeader: string | undefined,
    providerEventId: string,
  ): Promise<{ duplicate: boolean }> {
    if (!signatureHeader || !provider.verifyWebhookSignature(rawBody, signatureHeader)) {
      this.logger.log({ provider: `${category}:${provider.name}`, operation: "webhook.receive", outcome: "failure", errorMessage: "Invalid signature" });
      throw new UnauthorizedException("Invalid webhook signature.");
    }

    const providerKey = `${category}:${provider.name}`;
    const existing = await this.events.findOne({ where: { provider: providerKey, providerEventId } });
    if (existing) {
      this.logger.log({ provider: providerKey, operation: "webhook.receive", outcome: "success", errorMessage: "duplicate — replay protection triggered" });
      return { duplicate: true };
    }

    const event = await this.events.save(
      this.events.create({ provider: providerKey, providerEventId, rawBody, status: "received" }),
    );

    // Sprint 5.7/5.8 — hands off to the webhook-retry queue for actual
    // processing; BullMQ's own retry/backoff (queue.module.ts defaults)
    // provides the "Retry handling" deliverable, and its failed-job
    // list (after exhausting attempts) is the dead-letter queue, same
    // convention as email/SMS.
    await this.webhookQueue.add("process-webhook", { eventId: event.id, category });

    return { duplicate: false };
  }
}
