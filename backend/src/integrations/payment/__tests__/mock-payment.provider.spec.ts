import { MockPaymentProvider } from "../providers/mock-payment.provider";

describe("MockPaymentProvider", () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  it("succeeds for a positive amount", async () => {
    const result = await provider.initiatePayment({ orderId: "o1", amount: 20, currency: "USD", idempotencyKey: "k1" });
    expect(result.status).toBe("succeeded");
    expect(result.providerReference).toMatch(/^mock_pi_/);
  });

  it("fails deterministically for a non-positive amount", async () => {
    const result = await provider.initiatePayment({ orderId: "o1", amount: 0, currency: "USD", idempotencyKey: "k1" });
    expect(result.status).toBe("failed");
  });

  it("verifies a reference it issued as succeeded", async () => {
    const initiated = await provider.initiatePayment({ orderId: "o1", amount: 20, currency: "USD", idempotencyKey: "k1" });
    const verified = await provider.verifyPayment(initiated.providerReference);
    expect(verified.status).toBe("succeeded");
  });

  it("reports an unrecognized reference as failed", async () => {
    const verified = await provider.verifyPayment("not-a-real-reference");
    expect(verified.status).toBe("failed");
  });

  it("generates a valid webhook signature that verifyWebhookSignature accepts", () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    const signature = provider.signPayload(body);
    expect(provider.verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects a tampered payload against an old signature", () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    const signature = provider.signPayload(body);
    const tamperedBody = JSON.stringify({ event: "payment.failed" });
    expect(provider.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });
});
