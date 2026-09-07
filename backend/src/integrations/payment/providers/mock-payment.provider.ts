import { Injectable } from "@nestjs/common";
import { randomUUID, createHmac } from "crypto";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentResult,
} from "../payment-provider.interface";

// Sprint 5.2/5.10 — Mock Payment Provider: fully functional, deterministic,
// no network calls. This is the ACTIVE provider in every environment
// this sprint (config-selected — see payment.module.ts) since Sprint 5's
// OUT OF SCOPE explicitly excludes live credentials/real transactions.
// Payments below $0 fail deterministically; everything else succeeds —
// lets integration tests exercise both paths without mocking randomness.
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private readonly webhookSecret = "mock-webhook-secret"; // Sprint 5 scope: hardcoded is fine, this provider only ever runs in dev/test

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (input.amount <= 0) {
      return { providerReference: `mock_pi_${randomUUID()}`, status: "failed" };
    }
    return {
      providerReference: `mock_pi_${randomUUID()}`,
      clientSecret: `mock_secret_${randomUUID()}`,
      status: "succeeded", // Mock provider auto-succeeds — no separate client-side confirmation step to simulate
    };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    // Sprint 5 scope: the mock provider has no real persistent state
    // across calls (no external system to query) — verify always
    // reports success for any reference this provider itself issued
    // (recognizable by its "mock_pi_" prefix), and fails otherwise.
    const isKnownReference = providerReference.startsWith("mock_pi_");
    return {
      providerReference,
      status: isKnownReference ? "succeeded" : "failed",
      amountCaptured: isKnownReference ? 1 : 0, // Known Issues: amount isn't tracked per-reference in this mock — see docs
    };
  }

  async initiateRefund(input: RefundInput): Promise<RefundResult> {
    return { refundReference: `mock_re_${randomUUID()}`, status: "succeeded" };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    return signatureHeader === expected;
  }

  // Sprint 5.10 — test/dev helper: lets integration tests and the mock
  // webhook simulator (see webhooks docs) generate a validly-signed
  // payload without needing the real secret exposed elsewhere.
  signPayload(rawBody: string): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}
