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
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { verifyGuestCheckoutToken } from "@/common/security/guest-checkout-token";
import { LogisticsService } from "@/modules/logistics/logistics.service";

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
    private readonly logistics: LogisticsService,
  ) {}

  async initiatePayment(orderId: string, _amount: number, _currency: string, idempotencyKey: string, guestCheckoutToken?: string, user?: AuthenticatedUser) {
    return this.idempotency.runOnce(idempotencyKey, "payment:initiate", async () => {
      const order = await this.orders.getOrder(orderId);
      this.authorizeOrderAccess(order, user, guestCheckoutToken);
      if (order.status !== "pending_payment") {
        throw new Error(`Order ${orderId} is not awaiting payment.`);
      }

      // Never trust a browser-supplied amount/currency. The order total
      // and currency were calculated server-side when the order was created.
      const amount = Number(order.total);
      const currency = order.currency;
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid order payment amount.");

      // The browser idempotency key protects the individual Silku request, but it
      // changes when the customer retries after an ambiguous network outcome.
      // Cashfree's provider idempotency must instead be stable for the logical
      // payment operation. Order IDs are UUIDs, so the order ID itself is a
      // valid stable Cashfree idempotency key for this one payment operation.
      // This lets a retry safely recover the same provider order/session if
      // Cashfree created it but the original response never reached Silku.
      const providerIdempotencyKey = orderId;

      const result = await this.resilientCall.execute(
        { provider: this.provider.name, operation: "initiatePayment", timeoutMs: 10_000, retry: { maxAttempts: 3 } },
        () => this.provider.initiatePayment({ orderId, amount, currency, idempotencyKey: providerIdempotencyKey }),
      );

      // The provider idempotency key is stable per order, so a retry after an
      // ambiguous network/database response can legitimately return the same
      // provider reference. Reuse the existing local transaction instead of
      // attempting a duplicate insert on the unique providerReference index.
      let transaction = await this.transactionsRepo.findOne({
        where: { providerReference: result.providerReference },
      });

      if (transaction) {
        if (
          transaction.orderId !== orderId ||
          transaction.provider !== this.provider.name ||
          Math.abs(Number(transaction.amount) - amount) > 0.01 ||
          transaction.currency !== currency
        ) {
          throw new BadRequestException("Payment provider returned a conflicting transaction reference.");
        }
        transaction.status = result.status;
        await this.transactionsRepo.save(transaction);
      } else {
        transaction = await this.transactionsRepo.save(
          this.transactionsRepo.create({
            orderId,
            provider: this.provider.name,
            providerReference: result.providerReference,
            amount: amount.toFixed(2),
            currency,
            status: result.status,
          }),
        );
      }

      if (result.status === "succeeded") {
        await this.confirmPaymentAndEnsureShipment(orderId, result.providerReference);
      } else if (result.status === "failed") {
        await this.failPaymentAndReleaseStock(orderId, "Payment initiation failed.");
      }

      return result;
    });
  }

  async verifyPayment(providerReference: string, guestCheckoutToken?: string, user?: AuthenticatedUser) {
    const transaction = await this.transactionsRepo.findOne({ where: { providerReference } });
    if (!transaction) throw new NotFoundException("Payment transaction not found.");
    const order = await this.orders.getOrder(transaction.orderId);
    this.authorizeOrderAccess(order, user, guestCheckoutToken);

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

  async processWebhook(rawBody: string, signatureHeader: string, timestampHeader?: string) {
    if (!this.provider.verifyWebhookSignature(rawBody, signatureHeader, timestampHeader)) {
      throw new UnauthorizedException("Invalid payment webhook signature.");
    }
    let payload: unknown;
    try { payload = JSON.parse(rawBody); } catch { throw new BadRequestException("Invalid payment webhook payload."); }
    if (!payload || typeof payload !== "object") return { received: true, processed: false };
    const body = payload as Record<string, unknown>;
    const data = typeof body.data === "object" && body.data ? body.data as Record<string, unknown> : body;
    const nestedOrder = typeof data.order === "object" && data.order ? data.order as Record<string, unknown> : undefined;
    const orderId = [body.order_id, body.orderId, data.order_id, data.orderId, nestedOrder?.order_id, nestedOrder?.orderId]
      .find((v): v is string => typeof v === "string" && v.length > 0);
    if (!orderId) return { received: true, processed: false };
    const transaction = await this.transactionsRepo.findOne({ where: { orderId }, order: { createdAt: "DESC" } });
    if (!transaction || transaction.provider !== this.provider.name) return { received: true, processed: false };
    const verification = await this.resilientCall.execute(
      { provider: this.provider.name, operation: "verifyPayment:webhook", timeoutMs: 8_000, retry: { maxAttempts: 2 } },
      () => this.provider.verifyPayment(transaction.providerReference),
    );
    if (verification.providerReference !== transaction.providerReference) throw new BadRequestException("Payment provider reference mismatch.");
    if (verification.status === "succeeded" && Math.abs(verification.amountCaptured - Number(transaction.amount)) > 0.01) {
      throw new BadRequestException("Captured payment amount does not match the recorded order amount.");
    }
    if (verification.status !== transaction.status) {
      transaction.status = verification.status;
      await this.transactionsRepo.save(transaction);
    }
    const order = await this.orders.getOrder(transaction.orderId);
    if (verification.status === "succeeded" && order.status === "pending_payment") {
      await this.confirmPaymentAndEnsureShipment(transaction.orderId, transaction.providerReference);
    } else if (verification.status === "failed") {
      await this.failPaymentAndReleaseStock(transaction.orderId, "Payment failed at the provider.");
    }
    return { received: true, processed: true, status: verification.status };
  }

  async syncStatus(providerReference: string, guestCheckoutToken?: string, user?: AuthenticatedUser): Promise<PaymentTransactionEntity> {
    const transaction = await this.transactionsRepo.findOne({ where: { providerReference } });
    if (!transaction) throw new NotFoundException("Payment transaction not found.");
    const order = await this.orders.getOrder(transaction.orderId);
    this.authorizeOrderAccess(order, user, guestCheckoutToken);

    const verification = await this.verifyPayment(providerReference, guestCheckoutToken, user);
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
      if (order.status === "pending_payment") await this.confirmPaymentAndEnsureShipment(transaction.orderId, providerReference);
      else if (order.status === "confirmed" || order.status === "processing") await this.logistics.createShipment({ orderId: transaction.orderId });
    } else if (verification.status === "failed") {
      await this.failPaymentAndReleaseStock(transaction.orderId, "Payment failed at the provider.");
    }

    return transaction;
  }

  private async confirmPaymentAndEnsureShipment(orderId: string, paymentReference: string): Promise<void> {
    const order = await this.orders.getOrder(orderId);
    if (order.status === "pending_payment") {
      await this.orders.confirmOrder(orderId, paymentReference);
    }
    const confirmedOrder = await this.orders.getOrder(orderId);
    if (confirmedOrder.status === "confirmed" || confirmedOrder.status === "processing") {
      // Issue the legal invoice as part of the verified-payment workflow so
      // the customer bill is available even if the browser closes or the
      // confirmation page fails after payment.
      await this.orders.issueInvoice(orderId);
      await this.logistics.createShipment({ orderId });
    }
  }

  private authorizeOrderAccess(order: OrderEntity, user?: AuthenticatedUser, guestCheckoutToken?: string): void {
    if (user?.id === order.customerId) return;
    if (!user && guestCheckoutToken && verifyGuestCheckoutToken(order.id, guestCheckoutToken)) return;
    throw new ForbiddenException("Payment access is not authorized for this order.");
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
