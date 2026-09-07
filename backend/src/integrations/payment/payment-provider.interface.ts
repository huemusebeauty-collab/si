// Sprint 5.2 — Payment Gateway: provider-agnostic interface. Every
// concrete provider (Mock, Stripe, Razorpay, ...) implements this
// exact shape — PaymentService (below) never imports a concrete
// provider directly, only this interface, via the PAYMENT_PROVIDER DI
// token (payment.module.ts).
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";

export interface InitiatePaymentInput {
  orderId: string;
  amount: number; // major currency unit (e.g. dollars, not cents) — each adapter converts internally
  currency: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  providerReference: string; // opaque ID the provider assigns (e.g. Stripe PaymentIntent ID)
  clientSecret?: string; // for providers whose client SDK needs to complete the flow (e.g. Stripe)
  status: PaymentStatus;
}

export interface VerifyPaymentResult {
  providerReference: string;
  status: PaymentStatus;
  amountCaptured: number;
}

export interface RefundInput {
  providerReference: string;
  amount: number; // partial or full
  reason?: string;
}

export interface RefundResult {
  refundReference: string;
  status: "pending" | "succeeded" | "failed";
}

export interface PaymentProvider {
  readonly name: string;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyPayment(providerReference: string): Promise<VerifyPaymentResult>;
  initiateRefund(input: RefundInput): Promise<RefundResult>;
  // Sprint 5.2 — Webhook signature validation: each provider has its
  // own scheme (Stripe: HMAC-SHA256 over rawBody+timestamp; Razorpay:
  // HMAC-SHA256 over rawBody) — validated here, not in the generic
  // WebhookController, since the algorithm/header names are provider-
  // specific even though the *framework* around it (Sprint 5.7) is not.
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
