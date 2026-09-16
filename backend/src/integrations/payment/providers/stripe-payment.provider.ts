import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentResult,
} from "../payment-provider.interface";

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly secretKey?: string;
  private readonly webhookSecret?: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>("payment.stripe.secretKey");
    this.webhookSecret = this.config.get<string>("payment.stripe.webhookSecret");
  }

  private getClient(): Stripe {
    if (!this.secretKey) {
      throw new Error("PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY to be configured.");
    }
    return new Stripe(this.secretKey);
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const stripe = this.getClient();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(input.amount * 100),
        currency: input.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: input.orderId },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerReference: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      status: this.mapStatus(paymentIntent.status),
    };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    const stripe = this.getClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(providerReference);
    return {
      providerReference: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      amountCaptured: (paymentIntent.amount_received ?? 0) / 100,
    };
  }

  async initiateRefund(input: RefundInput): Promise<RefundResult> {
    const stripe = this.getClient();
    const refund = await stripe.refunds.create({
      payment_intent: input.providerReference,
      amount: Math.round(input.amount * 100),
      reason: this.mapRefundReason(input.reason),
    });
    return {
      refundReference: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : refund.status === "pending" ? "pending" : "failed",
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret) return false;
    try {
      const stripe = this.getClient();
      stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  private mapStatus(status: Stripe.PaymentIntent.Status): "pending" | "succeeded" | "failed" {
    if (status === "succeeded") return "succeeded";
    if (["canceled", "requires_payment_method"].includes(status)) return "failed";
    return "pending";
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    if (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer") return reason;
    return undefined;
  }
}
