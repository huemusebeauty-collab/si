import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyPaymentResult,
} from "../payment-provider.interface";
import { OrdersService } from "@/modules/orders/orders.service";

type CashfreeOrderResponse = {
  order_id: string;
  order_status?: string;
  payment_session_id?: string;
  order_amount?: number;
  order_currency?: string;
};

@Injectable()
export class CashfreePaymentProvider implements PaymentProvider {
  readonly name = "cashfree";
  private readonly client: AxiosInstance;
  private readonly appId?: string;
  private readonly secretKey?: string;
  private readonly apiVersion: string;
  private readonly returnUrl?: string;
  private readonly environment: "sandbox" | "production";

  constructor(
    private readonly config: ConfigService,
    private readonly orders: OrdersService,
  ) {
    this.appId = this.config.get<string>("payment.cashfree.appId");
    this.secretKey = this.config.get<string>("payment.cashfree.secretKey");
    this.apiVersion = this.config.get<string>("payment.cashfree.apiVersion") ?? "2025-01-01";
    this.returnUrl = this.config.get<string>("payment.cashfree.returnUrl");
    this.environment = this.config.get<string>("payment.cashfree.environment") === "production" ? "production" : "sandbox";

    this.client = axios.create({
      baseURL:
        this.environment === "production"
          ? "https://api.cashfree.com/pg"
          : "https://sandbox.cashfree.com/pg",
      timeout: 10_000,
    });
  }

  private getHeaders(idempotencyKey?: string): Record<string, string> {
    if (!this.appId || !this.secretKey) {
      throw new Error("PAYMENT_PROVIDER=cashfree requires CASHFREE_APP_ID and CASHFREE_SECRET_KEY.");
    }
    return {
      "Content-Type": "application/json",
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": this.apiVersion,
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    };
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!this.returnUrl) {
      throw new Error("PAYMENT_PROVIDER=cashfree requires CASHFREE_RETURN_URL.");
    }

    const order = await this.orders.getOrder(input.orderId);
    const shipping = order.shippingAddress as Record<string, unknown>;
    const phone = typeof shipping.phone === "string" ? shipping.phone.replace(/\D/g, "") : "";
    if (!phone || phone.length < 10) {
      throw new Error("A valid customer phone number is required for Cashfree checkout.");
    }

    const response = await this.client.post<CashfreeOrderResponse>(
      "/orders",
      {
        order_id: input.orderId,
        order_amount: Number(input.amount.toFixed(2)),
        order_currency: input.currency,
        customer_details: {
          customer_id: order.customerId,
          customer_phone: phone.slice(-10),
          customer_name: typeof shipping.fullName === "string" ? shipping.fullName : "Silku Customer",
        },
        order_meta: {
          return_url: `${this.returnUrl}?order_id={order_id}`,
        },
      },
      { headers: this.getHeaders(input.idempotencyKey) },
    );

    if (!response.data.payment_session_id) {
      throw new Error("Cashfree did not return a payment session.");
    }

    return {
      providerReference: response.data.order_id || input.orderId,
      clientSecret: response.data.payment_session_id,
      status: this.mapOrderStatus(response.data.order_status),
    };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    const response = await this.client.get<CashfreeOrderResponse>(
      `/orders/${encodeURIComponent(providerReference)}`,
      { headers: this.getHeaders() },
    );

    const orderStatus = response.data.order_status;
    return {
      providerReference: response.data.order_id || providerReference,
      status: this.mapOrderStatus(orderStatus),
      amountCaptured: orderStatus === "PAID" ? Number(response.data.order_amount ?? 0) : 0,
    };
  }

  async initiateRefund(input: RefundInput): Promise<RefundResult> {
    const stableKey = input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
    const refundId = `refund_${stableKey || input.providerReference.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}`;
    const response = await this.client.post<{ refund_status?: string }>(
      `/orders/${encodeURIComponent(input.providerReference)}/refunds`,
      {
        refund_id: refundId,
        refund_amount: Number(input.amount.toFixed(2)),
        refund_note: input.reason ?? "Customer refund",
      },
      { headers: this.getHeaders(input.idempotencyKey) },
    );

    const status = response.data.refund_status;
    return {
      refundReference: refundId,
      status: status === "SUCCESS" ? "succeeded" : status === "PENDING" ? "pending" : "failed",
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    // Cashfree webhook signatures are calculated from timestamp + raw request body
    // and encoded as base64. The generic interface currently supplies only one
    // header, so signature verification is intentionally fail-closed here.
    // Webhook handling must pass x-webhook-timestamp separately before enabling
    // automated webhook fulfillment.
    void rawBody;
    void signatureHeader;
    return false;
  }

  private mapOrderStatus(status?: string): "pending" | "succeeded" | "failed" {
    if (status === "PAID") return "succeeded";
    if (["EXPIRED", "TERMINATED", "CANCELLED"].includes(status ?? "")) return "failed";
    return "pending";
  }
}
