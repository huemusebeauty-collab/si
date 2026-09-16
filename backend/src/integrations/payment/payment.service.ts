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

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectRepository(PaymentTransactionEntity) private readonly transactions: Repository<PaymentTransactionEntity>,
    private readonly idempotency: IdempotencyService,
    private readonly resilientCall: ResilientCallService,
    private readonly orders: OrdersService,
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

  async syncStatus(providerReference: string): Promise<PaymentTransactionEntity> {
    const transaction = await this.transactions.findOne({ where: { providerReference } });
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
      await this.transactions.save(transaction);
    }

    if (verification.status === "succeeded") {
      await this.orders.confirmOrder(transaction.orderId, providerReference);
    } else if (verification.status === "failed") {
      await this.orders.failOrder(transaction.orderId, "Payment failed at the provider.");
    }

    return transaction;
  }
}
