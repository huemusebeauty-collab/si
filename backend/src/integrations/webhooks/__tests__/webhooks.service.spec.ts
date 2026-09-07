import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bullmq";
import { UnauthorizedException } from "@nestjs/common";
import { WebhooksService } from "../webhooks.service";
import { WebhookEventEntity } from "../entities/webhook-event.entity";
import { QUEUE_NAMES } from "@/integrations/queue/queue.constants";
import { IntegrationLoggerService } from "@/integrations/common/integration-logger.service";
import { MockPaymentProvider } from "@/integrations/payment/providers/mock-payment.provider";

function createMockRepo() {
  return { findOne: jest.fn(), save: jest.fn((e: unknown) => Promise.resolve({ id: "evt1", ...e as object })), create: jest.fn((e: unknown) => e) };
}

// Sprint 5.10/5.7 — Webhook Framework: signature verification and
// replay protection, exercised against the real MockPaymentProvider
// (not a further mock of it) so the signature scheme is genuinely
// checked end-to-end.
describe("WebhooksService", () => {
  let service: WebhooksService;
  let eventsRepo: ReturnType<typeof createMockRepo>;
  let queueAdd: jest.Mock;
  const provider = new MockPaymentProvider();

  beforeEach(async () => {
    eventsRepo = createMockRepo();
    queueAdd = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(WebhookEventEntity), useValue: eventsRepo },
        { provide: getQueueToken(QUEUE_NAMES.WEBHOOK_RETRY), useValue: { add: queueAdd } },
        { provide: IntegrationLoggerService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  it("rejects a webhook with an invalid signature", async () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    await expect(service.receive(provider, "payment", body, "not-a-valid-signature", "evt-1")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it("accepts and enqueues a webhook with a valid signature", async () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    const signature = provider.signPayload(body);
    eventsRepo.findOne.mockResolvedValue(null); // no existing event — first delivery

    const result = await service.receive(provider, "payment", body, signature, "evt-1");
    expect(result.duplicate).toBe(false);
    expect(queueAdd).toHaveBeenCalledTimes(1);
  });

  it("detects a replayed (duplicate) event and does NOT re-enqueue it", async () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    const signature = provider.signPayload(body);
    eventsRepo.findOne.mockResolvedValue({ id: "existing-event", provider: "payment:mock", providerEventId: "evt-1" });

    const result = await service.receive(provider, "payment", body, signature, "evt-1");
    expect(result.duplicate).toBe(true);
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
