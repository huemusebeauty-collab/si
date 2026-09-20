import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from "./payment-provider.interface";
import { PaymentTransactionEntity } from "./entities/payment-transaction.entity";
import { IdempotencyService } from "./idempotency.service";
import { ResilientCallService } from "@/integrations/common/resilient-call.service";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { OrderEntity } from "@/modules/orders/entities/order.entity";
import { OrderStatusHistoryEntity } from "@/modules/orders/entities/order-status-history.entity";

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectRepository(PaymentTransactionEntity) private readonly transactionsRepo: Repository<PaymentTransactionEntity>,
    private readonly idempotency: IdempotencyService,
    private readonly resilientCall: ResilientCallService,
    private readonly orders: OrdersService,
    private readonly products: ProductsService,
    private readonly transactionService: TransactionService,
  ) {}

  async initiatePayment(orderId: string, _amount: number, _currency: string, idempotencyKey: string) {
    return this.idempotency.runOnce(idempotencyKey, "payment:initiate", async () => {
      const order = await this.orders.getOrder(orderId);
      if (order.status !== "pending_payment") {
        throw new Error(`Order ${orderId} is not awaiting payment.`);
      }

      // Never trust a browser-supplied amount/currency. The order total
      // and currency were calculated server-side when the order was created.
      const amount = Number(order.total);
      const currency = order.currency;
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid order payment amount.");

      const result = await this.resilientCall.execute(
        { provider: this.provider.name, operation: "initiatePayment", timeoutMs: 10_000, retry: { maxAttempts: 3 } },
        () => this.provider.initiatePayment({ orderId, amount, currency, idempotencyKey }),
      );

      await this.transactionsRepo.save(
        this.transactionsRepo.create({
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
        await this.failPaymentAndReleaseStock(orderId, "Payment initiation failed.");
      }

      return result;
    });
  }

  async verifyPayment(providerReference: string) {
    return this.resilientCall.execute(
      { provider: this.provider.name, operation: "verifyPayment", timeoutMs: 8_000, retry: { maxAttempts: 2 } },
      () => this.provider.verifyPayment(providerReference),
    );
  }

  async initiateRefund(orderId: string, amount: number, reason?: string) {
    const transaction = await this.transactionsRepo.findOne({ where: { orderId }, order: { createdAt: "DESC" } });
    if (!transaction) {
      throw new NotFoundException("No payment transaction found for this order.");
    }
    if (transaction.status === "refunded") {
      throw new BadRequestException("This payment has already been refunded.");
    }
    const refundProcessingTimeoutMs = 5 * 60 * 1000;
    const refundProcessingCutoff = new Date(Date.now() - refundProcessingTimeoutMs);
    const refundProcessingIsStale =
      transaction.status === "refund_processing" &&
      transaction.updatedAt instanceof Date &&
      transaction.updatedAt < refundProcessingCutoff;
    if (transaction.status === "refund_processing" && !refundProcessingIsStale) {
      throw new BadRequestException("A refund is already being processed for this payment.");
    }
    const requestedAmount = Number(amount);
    const capturedAmount = Number(transaction.amount);
    // The current transaction model tracks one refundable amount and one
    // refunded state, so only a full refund is safe until partial-refund
    // accounting is introduced.
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || Math.abs(requestedAmount - capturedAmount) > 0.01) {
      throw new BadRequestException("Refund amount must exactly match the captured payment amount.");
    }
    const eligibility = await this.orders.checkRefundEligibility(orderId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason ?? "This order is not eligible for a refund.");
    }

    // Claim the refund atomically before calling the external provider.
    // Never hold a DB transaction open across the provider call.
    const claimCriteria = refundProcessingIsStale
      ? [
          { id: transaction.id, status: "succeeded" as const },
          { id: transaction.id, status: "refund_processing" as const, updatedAt: LessThan(refundProcessingCutoff) },
        ]
      : { id: transaction.id, status: "succeeded" as const };
    const claim = await this.transactionsRepo.update(
      claimCriteria,
      { status: "refund_processing" },
    );
    if (!claim.affected) {
      throw new BadRequestException("A refund is already being processed for this payment.");
    }

    try {
      const result = await this.resilientCall.execute(
        { provider: this.provider.name, operation: "initiateRefund", timeoutMs: 10_000, retry: { maxAttempts: 3 } },
        () => this.provider.initiateRefund({
          providerReference: transaction.providerReference,
          amount: requestedAmount,
          idempotencyKey: `refund:${transaction.id}`,
          reason,
        }),
      );
      if (result.status === "succeeded") {
        await this.transactionsRepo.update(
          { id: transaction.id, status: "refund_processing" },
          { status: "refunded" },
        );
      } else if (result.status === "failed") {
        // A definitive provider failure is retryable, so release the claim.
        await this.transactionsRepo.update(
          { id: transaction.id, status: "refund_processing" },
          { status: "succeeded" },
        );
      }
      // A pending provider refund remains refund_processing locally.
      // This prevents a second refund attempt while the provider is still
      // processing the same stable idempotency key.
      return result;
    } catch (error) {
      // A timeout/network error has an unknown provider outcome. Keep the
      // local claim so the stale-claim recovery path can reconcile/retry
      // safely using the same provider idempotency key.
      throw error;
    }
  }

  async syncStatus(providerReference: string): Promise<PaymentTransactionEntity> {
    const transaction = await this.transactionsRepo.findOne({ where: { providerReference } });
    if (!transaction) throw new NotFoundException("Payment transaction not found.");

    const verification = await this.verifyPayment(providerReference);
    if (verification.providerReference !== transaction.providerReference) {
      throw new Error("Payment provider reference mismatch.");
    }
    if (Math.abs(verification.amountCaptured - Number(transaction.amount)) > 0.01 && verification.status === "succeeded") {
      throw new Error("Captured payment amount does not match the recorded order amount.");
    }

    if (verification.status !== transaction.status) {
      transaction.status = verification.status;
      await this.transactionsRepo.save(transaction);
    }

    if (verification.status === "succeeded") {
      const order = await this.orders.getOrder(transaction.orderId);
      if (order.status === "pending_payment") await this.orders.confirmOrder(transaction.orderId, providerReference);
    } else if (verification.status === "failed") {
      await this.failPaymentAndReleaseStock(transaction.orderId, "Payment failed at the provider.");
    }

    return transaction;
  }

  private async failPaymentAndReleaseStock(orderId: string, reason: string): Promise<void> {
    const order = await this.orders.getOrder(orderId);
    if (order.status !== "pending_payment") return;

    await this.transactionService.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      for (const line of order.lineItems) {
        await this.products.adjustStock(line.variantId, line.quantity, manager);
      }
      await manager.update(OrderEntity, order.id, { status: "payment_failed" });
      await manager.save(manager.create(OrderStatusHistoryEntity, { order, status: "payment_failed" }));
    });

    void reason;
  }
}
