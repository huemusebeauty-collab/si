import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentService } from "../payment.service";
import { PAYMENT_PROVIDER } from "../payment-provider.interface";

describe("PaymentService reliability", () => {
  const provider = {
    name: "mock",
    initiatePayment: jest.fn(),
    verifyPayment: jest.fn(),
    initiateRefund: jest.fn(),
  };
  const transactionsRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const idempotency = { runOnce: jest.fn(async (_key, _scope, fn) => fn()) };
  const resilientCall = { execute: jest.fn(async (_options, fn) => fn()) };
  const orders = {
    getOrder: jest.fn(),
    confirmOrder: jest.fn(),
    checkRefundEligibility: jest.fn(),
  };
  const products = { adjustStock: jest.fn() };
  const transactionService = {
    runInTransaction: jest.fn(async (fn) => fn({ manager: {
      update: jest.fn(),
      create: jest.fn((_, value) => value),
      save: jest.fn(),
    }})),
  };

  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService(
      provider as never,
      transactionsRepo as never,
      idempotency as never,
      resilientCall as never,
      orders as never,
      products as never,
      transactionService as never,
    );
  });

  it("uses the server order total instead of the browser amount", async () => {
    orders.getOrder.mockResolvedValue({ id: "o1", status: "pending_payment", total: "1499.00", currency: "INR" });
    provider.initiatePayment.mockResolvedValue({ providerReference: "pi_1", status: "pending", clientSecret: "cs_1" });

    await service.initiatePayment("o1", 1, "USD", "idem-1");

    expect(provider.initiatePayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 1499, currency: "INR", orderId: "o1" }));
  });

  it("confirms the order only when payment initiation succeeds", async () => {
    orders.getOrder.mockResolvedValue({ id: "o1", status: "pending_payment", total: "100.00", currency: "INR" });
    provider.initiatePayment.mockResolvedValue({ providerReference: "pi_ok", status: "succeeded" });

    await service.initiatePayment("o1", 100, "INR", "idem-2");

    expect(orders.confirmOrder).toHaveBeenCalledWith("o1", "pi_ok");
  });

  it("releases inventory when payment initiation fails", async () => {
    const order = {
      id: "o2",
      status: "pending_payment",
      total: "200.00",
      currency: "INR",
      lineItems: [{ variantId: "v1", quantity: 2 }, { variantId: "v2", quantity: 1 }],
    };
    orders.getOrder.mockResolvedValue(order);
    provider.initiatePayment.mockResolvedValue({ providerReference: "pi_fail", status: "failed" });

    await service.initiatePayment("o2", 200, "INR", "idem-3");

    expect(products.adjustStock).toHaveBeenCalledWith("v1", 2, expect.anything());
    expect(products.adjustStock).toHaveBeenCalledWith("v2", 1, expect.anything());
    expect(orders.confirmOrder).not.toHaveBeenCalled();
  });

  it("rejects a successful provider verification when captured amount differs", async () => {
    transactionsRepo.findOne.mockResolvedValue({ orderId: "o3", providerReference: "pi_3", amount: "500.00", status: "pending" });
    provider.verifyPayment.mockResolvedValue({ providerReference: "pi_3", status: "succeeded", amountCaptured: 499 });

    await expect(service.syncStatus("pi_3")).rejects.toThrow("Captured payment amount does not match");
    expect(orders.confirmOrder).not.toHaveBeenCalled();
  });

  it("does not confirm twice when sync sees an already-confirmed order", async () => {
    transactionsRepo.findOne.mockResolvedValue({ orderId: "o4", providerReference: "pi_4", amount: "500.00", status: "pending" });
    provider.verifyPayment.mockResolvedValue({ providerReference: "pi_4", status: "succeeded", amountCaptured: 500 });
    orders.getOrder.mockResolvedValue({ id: "o4", status: "confirmed" });

    await service.syncStatus("pi_4");

    expect(orders.confirmOrder).not.toHaveBeenCalled();
  });

  it("rejects a second refund after the transaction is refunded", async () => {
    transactionsRepo.findOne.mockResolvedValue({ orderId: "o5", providerReference: "pi_5", amount: "500.00", status: "refunded" });

    await expect(service.initiateRefund("o5", 500)).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.initiateRefund).not.toHaveBeenCalled();
  });

  it("rejects a concurrent refund when another request already claimed the transaction", async () => {
    const transaction = { id: "tx-concurrent", orderId: "o-concurrent", providerReference: "pi-concurrent", amount: "500.00", status: "succeeded" };
    transactionsRepo.findOne.mockResolvedValue(transaction);
    orders.checkRefundEligibility.mockResolvedValue({ eligible: true });
    transactionsRepo.update.mockResolvedValue({ affected: 0 });

    await expect(service.initiateRefund("o-concurrent", 500)).rejects.toThrow(
      "A refund is already being processed for this payment.",
    );
    expect(provider.initiateRefund).not.toHaveBeenCalled();
  });

  it("passes a stable transaction-scoped idempotency key to refund providers", async () => {
    const transaction = { id: "tx-1", orderId: "o6", providerReference: "pi_6", amount: "500.00", status: "succeeded" };
    transactionsRepo.findOne
      .mockResolvedValueOnce({ ...transaction })
      .mockResolvedValueOnce({ ...transaction });
    orders.checkRefundEligibility.mockResolvedValue({ eligible: true });
    provider.initiateRefund.mockResolvedValue({ refundReference: "re_1", status: "succeeded" });
    transactionsRepo.update.mockResolvedValue({ affected: 1 });

    await service.initiateRefund("o6", 500, "requested_by_customer");
    await service.initiateRefund("o6", 500, "requested_by_customer");

    expect(provider.initiateRefund).toHaveBeenNthCalledWith(1, {
      providerReference: "pi_6",
      amount: 500,
      idempotencyKey: "refund:tx-1",
      reason: "requested_by_customer",
    });
    expect(provider.initiateRefund).toHaveBeenNthCalledWith(2, {
      providerReference: "pi_6",
      amount: 500,
      idempotencyKey: "refund:tx-1",
      reason: "requested_by_customer",
    });
  });

  it("rejects a partial refund until partial-refund accounting exists", async () => {
    transactionsRepo.findOne.mockResolvedValue({ orderId: "o6", providerReference: "pi_6", amount: "500.00", status: "succeeded" });

    await expect(service.initiateRefund("o6", 100)).rejects.toBeInstanceOf(BadRequestException);
    expect(orders.checkRefundEligibility).not.toHaveBeenCalled();
  });

  it("fails clearly when a refund has no payment transaction", async () => {
    transactionsRepo.findOne.mockResolvedValue(null);

    await expect(service.initiateRefund("missing", 100)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("keeps payment initiation inside the idempotency boundary", async () => {
    orders.getOrder.mockResolvedValue({ id: "o7", status: "pending_payment", total: "100.00", currency: "INR" });
    provider.initiatePayment.mockResolvedValue({ providerReference: "pi_7", status: "pending" });

    await service.initiatePayment("o7", 100, "INR", "idem-7");

    expect(idempotency.runOnce).toHaveBeenCalledWith("idem-7", "payment:initiate", expect.any(Function));
  });
});
