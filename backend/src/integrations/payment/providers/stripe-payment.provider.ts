import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentResult,
} from "../payment-provider.interface";

// Sprint 5.2 — Stripe adapter. Demonstrates the provider-swap pattern
// Sprint 5.2 asks for ("configurable ... without changing business
// logic") — PaymentService's code does not change one line if this
// provider is selected instead of MockPaymentProvider.
//
// NOT exercised against a live Stripe account in Sprint 5 — explicitly
// out of scope ("Live production credentials, Real payment
// transactions"). This class is structurally complete (real Stripe API
// shapes, real webhook signature scheme) but unverified against Stripe's
// actual API. Only ever instantiated if PAYMENT_PROVIDER=stripe AND a
// real STRIPE_SECRET_KEY is configured — never the default (see
// payment.module.ts). If the `stripe` package isn't installed (it's
// listed in package.json but, per this sandbox's constraints, never
// actually `pnpm install`ed — see Sprint 5 validation report), this
// class's constructor throws clearly rather than silently no-op-ing.
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly secretKey?: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    // Sprint 5.9 correction: does NOT throw here. This provider is
    // always instantiated by Nest's DI container (it's a normal
    // provider in payment.module.ts) regardless of which provider is
    // actually *selected* via PAYMENT_PROVIDER — throwing in the
    // constructor would crash app boot in every Sprint 5 environment,
    // since none of them configure a real Stripe key. The missing-
    // credential check is deferred to each method that actually needs
    // to call Stripe, so an unconfigured StripePaymentProvider can
    // exist harmlessly as long as it's never the active provider.
    this.secretKey = this.config.get<string>("payment.stripe.secretKey");
    this.webhookSecret = this.config.get<string>("payment.stripe.webhookSecret") ?? "";
  }

  private assertConfigured(): void {
    if (!this.secretKey) {
      throw new Error(
        "PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY to be configured. " +
          "This is expected to be unset in every Sprint 5 environment (live credentials are out of scope).",
      );
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    // Real integration point: `stripe.paymentIntents.create({ amount:
    // Math.round(input.amount * 100), currency: input.currency,
    // metadata: { orderId: input.orderId } }, { idempotencyKey:
    // input.idempotencyKey })`. Not called here — no live credentials
    // exist in this sprint to call it against.
    throw new Error("StripePaymentProvider.initiatePayment is not exercised in Sprint 5 — no live credentials configured.");
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    this.assertConfigured();
    throw new Error("StripePaymentProvider.verifyPayment is not exercised in Sprint 5 — no live credentials configured.");
  }

  async initiateRefund(input: RefundInput): Promise<RefundResult> {
    this.assertConfigured();
    throw new Error("StripePaymentProvider.initiateRefund is not exercised in Sprint 5 — no live credentials configured.");
  }

  // Sprint 5.2/5.7 — this method IS real, working code (no network call,
  // no live credentials needed) — Stripe's actual webhook signature
  // scheme: HMAC-SHA256 over `${timestamp}.${rawBody}`, header format
  // `t=<timestamp>,v1=<signature>`.
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => part.split("=") as [string, string]),
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    const expected = createHmac("sha256", this.webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    return signature === expected;
  }
}
