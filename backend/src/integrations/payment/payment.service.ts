import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from "./payment-provider.interface";
import { PaymentTransactionEntity } from "./entities/payment-transaction.entity";
import { IdempotencyService } from "./idempotency.service";
import { ResilientCallService } from "@/integrations/common/resilient-call.service";
import { OrdersService } from "@/modules/orders/orders.service";

// Sprint 5.2 — PaymentService: the ONLY thing OrdersService/controllers
// should call for payment operations — never a provider directly.
// Every provider call routes through ResilientCallService (Sprint 5.1)
// for timeout/retry/circuit-breaking/logging/status-reporting.
@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectRepository(PaymentTransactionEntity) private readonly transactions: Repository<PaymentTransactionEntity>,
    private readonly idempotency: IdempotencyService,
    private readonly resilientCall: ResilientCallService,
    private readonly orders: OrdersService,
  ) {}

  async initiatePayment(orderId: string, amount: number, currency: string, idempotencyKey: string) {
    return this.idempotency.runOnce(idempotencyKey, "payment:initiate", async () => {
      const result = await this.resilientCall.execute(
        { provider: this.provider.name, operation: "initiatePayment", timeoutMs: 10_000, retry: { maxAttempts: 3 } },
        () => this.provider.initiatePayment({ orderId, amount, currency, idempotencyKey }),
      );

      await this.transactions.save(
        this.transactions.create({
          orderId,
          provider: this.provider.name,
          providerReference: result.providerReference,
          amount: amount.toFixed(2),
          currency,
          status: result.status,
        }),
      );

      if (result.status === "succeeded") {
        await this.orders.confirmOrder(orderId, result.providerReference);
      } else if (result.status === "failed") {
        await this.orders.failOrder(orderId, "Payment initiation failed.");
      }

      return result;
    });
  }

  // Sprint 5.2 — payment verification, called independently of webhooks
  // (e.g. a reconciliation job — see Sprint 5.8) as a source-of-truth
  // cross-check against whatever a webhook already reported.
  async verifyPayment(providerReference: string) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "verifyPayment", timeoutMs: 8_000, retry: { maxAttempts: 2 } },
      () => this.provider.verifyPayment(providerReference),
    );
  }

  async initiateRefund(orderId: string, amount: number, reason?: string) {
    const transaction = await this.transactions.findOne({ where: { orderId }, order: { createdAt: "DESC" } });
    if (!transaction) {
      throw new NotFoundException("No payment transaction found for this order.");
    }
    const result = await this.resilientCall.execute(
      { provider: this.provider.name, operation: "initiateRefund", timeoutMs: 10_000, retry: { maxAttempts: 3 } },
      () => this.provider.initiateRefund({ providerReference: transaction.providerReference, amount, reason }),
    );
    if (result.status === "succeeded") {
      transaction.status = "refunded";
      await this.transactions.save(transaction);
    }
    return result;
  }

  // Sprint 5.2 — payment status synchronization: reconciles this
  // service's stored status against what the provider currently
  // reports, updating the local record if they've drifted.
  async syncStatus(providerReference: string): Promise<PaymentTransactionEntity> {
    const transaction = await this.transactions.findOne({ where: { providerReference } });
    if (!transaction) throw new NotFoundException("Payment transaction not found.");

    const verification = await this.verifyPayment(providerReference);
    if (verification.status !== transaction.status) {
      transaction.status = verification.status;
      await this.transactions.save(transaction);
    }
    return transaction;
  }
}
