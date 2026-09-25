import { PaymentService } from "./payment.service";
import type { PaymentProvider } from "./payment-provider.interface";
import type { IdempotencyService } from "./idempotency.service";
import type { ResilientCallService } from "@/integrations/common/resilient-call.service";
import type { OrdersService } from "@/modules/orders/orders.service";
import type { ProductsService } from "@/modules/products/products.service";
import type { TransactionService } from "@/database/transaction.service";
import type { PaymentTransactionEntity } from "./entities/payment-transaction.entity";

describe("PaymentService provider idempotency", () => {
  it("uses the stable order UUID for provider idempotency across checkout retries", async () => {
    const orderId = "8f3f2f3d-4a6f-4d6f-9b17-5d2c6f4a9e11";
    const provider = {
      name: "cashfree",
      initiatePayment: jest.fn().mockResolvedValue({
        providerReference: orderId,
        clientSecret: "session_test",
        status: "pending",
      }),
      verifyPayment: jest.fn(),
      initiateRefund: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    } as unknown as PaymentProvider;

    const orders = {
      getOrder: jest.fn().mockResolvedValue({
        id: orderId,
        customerId: "customer-1",
        status: "pending_payment",
        total: "250.00",
        currency: "INR",
      }),
      confirmOrder: jest.fn(),
    } as unknown as OrdersService;

    const transactionsRepo = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as {
      create: (value: unknown) => unknown;
      save: (value: unknown) => Promise<void>;
    };

    const idempotency = {
      runOnce: async (_key: string, _scope: string, work: () => Promise<unknown>) => work(),
    } as unknown as IdempotencyService;

    const resilientCall = {
      execute: async (
        _options: unknown,
        operation: () => Promise<unknown>,
      ) => operation(),
    } as unknown as ResilientCallService;

    const products = {} as unknown as ProductsService;
    const transactionService = {} as unknown as TransactionService;

    const service = new PaymentService(
      provider,
      transactionsRepo as never,
      idempotency,
      resilientCall,
      orders,
      products,
      transactionService,
    );

    await service.initiatePayment(
      orderId,
      250,
      "INR",
      "retry-key-1",
      undefined,
      { id: "customer-1" } as never,
    );
    await service.initiatePayment(
      orderId,
      250,
      "INR",
      "retry-key-2",
      undefined,
      { id: "customer-1" } as never,
    );

    expect(provider.initiatePayment).toHaveBeenCalledTimes(2);
    expect(provider.initiatePayment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderId,
        idempotencyKey: orderId,
      }),
    );
    expect(provider.initiatePayment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderId,
        idempotencyKey: orderId,
      }),
    );
  });
});
