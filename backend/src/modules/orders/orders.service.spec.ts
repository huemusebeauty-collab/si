import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { InvoiceEntity } from "./entities/invoice.entity";
import { InvoiceSequenceEntity } from "./entities/invoice-sequence.entity";
import { ShipmentEntity } from "@/modules/logistics/entities/shipment.entity";
import { ShipmentEventEntity } from "@/modules/logistics/entities/shipment-event.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { SettingsService } from "@/admin/settings/settings.service";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo<T extends object>() {
  return { findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn(), save: jest.fn((entity: T) => Promise.resolve(entity)), create: jest.fn((entity: Partial<T>) => entity as T) };
}

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof createMockRepo<OrderEntity>>;
  let historyRepo: ReturnType<typeof createMockRepo<OrderStatusHistoryEntity>>;
  let invoiceRepo: ReturnType<typeof createMockRepo<InvoiceEntity>>;
  let shipmentRepo: ReturnType<typeof createMockRepo<ShipmentEntity>>;
  let shipmentEventRepo: ReturnType<typeof createMockRepo<ShipmentEventEntity>>;
  let productService: { adjustStock: jest.Mock; findVariantById: jest.Mock; listInventory: jest.Mock };
  let transactionService: { runInTransaction: jest.Mock };

  beforeEach(async () => {
    orderRepo = createMockRepo<OrderEntity>();
    historyRepo = createMockRepo<OrderStatusHistoryEntity>();
    invoiceRepo = createMockRepo<InvoiceEntity>();
    shipmentRepo = createMockRepo<ShipmentEntity>();
    shipmentEventRepo = createMockRepo<ShipmentEventEntity>();
    productService = { adjustStock: jest.fn(), findVariantById: jest.fn(), listInventory: jest.fn() };
    const manager = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_: unknown, entity: unknown) => entity),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue({ id: "o1", status: "processing", lineItems: [{ variantId: "v1", quantity: 2 }], statusHistory: [] }),
    };
    transactionService = { runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })) };
    const settingsService = { getBusinessSettings: jest.fn().mockResolvedValue({ storeName: "Silku", gstRegistered: false, reverseChargeDefault: false }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OrderLineItemEntity), useValue: createMockRepo<OrderLineItemEntity>() },
        { provide: getRepositoryToken(OrderStatusHistoryEntity), useValue: historyRepo },
        { provide: getRepositoryToken(InvoiceEntity), useValue: invoiceRepo },
        { provide: getRepositoryToken(InvoiceSequenceEntity), useValue: createMockRepo<InvoiceSequenceEntity>() },
        { provide: getRepositoryToken(ShipmentEntity), useValue: shipmentRepo },
        { provide: getRepositoryToken(ShipmentEventEntity), useValue: shipmentEventRepo },
        { provide: CartService, useValue: {} },
        { provide: ProductsService, useValue: productService },
        { provide: TransactionService, useValue: transactionService },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it("rejects invoice access before payment is confirmed", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "pending_payment", lineItems: [] } as unknown as OrderEntity);
    await expect(service.generateInvoice("o1")).rejects.toThrow("An invoice is only available after payment is confirmed.");
  });

  it("returns an unissued invoice preview without inventing an invoice number", async () => {
    orderRepo.findOne.mockResolvedValue({
      id: "o1",
      status: "confirmed",
      lineItems: [],
      subtotal: "100.00",
      discountAmount: "0.00",
      taxableAmount: "100.00",
      taxAmount: "18.00",
      total: "118.00",
      currency: "INR",
    } as unknown as OrderEntity);
    invoiceRepo.findOne.mockResolvedValue(null);

    const result = await service.generateInvoice("o1");
    expect(result.invoiceNumber).toBeNull();
    expect(result.issuedAt).toBeNull();
    expect(result.total).toBe("118.00");
  });

  it("issues one persistent invoice per order and reuses it idempotently", async () => {
    const order = {
      id: "o1",
      customerId: "c1",
      status: "confirmed",
      shippingAddress: { city: "Jaipur" },
      lineItems: [],
      subtotal: "100.00",
      discountAmount: "0.00",
      taxableAmount: "100.00",
      taxAmount: "18.00",
      total: "118.00",
      currency: "INR",
      createdAt: new Date("2026-09-19T10:00:00Z"),
    } as unknown as OrderEntity;
    const transactionInvoiceRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity: Partial<InvoiceEntity>) => entity),
      save: jest.fn(async (entity: Partial<InvoiceEntity>) => ({ id: "inv1", ...entity })),
    };
    const transactionSequenceRepo = {
      query: jest.fn().mockResolvedValue([{ issuedNumber: "1" }]),
    };
    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) =>
      work({
        manager: {
          getRepository: jest.fn((entity: unknown) =>
            entity === OrderEntity
              ? { findOne: jest.fn().mockResolvedValue(order) }
              : entity === InvoiceEntity
                ? transactionInvoiceRepo
                : transactionSequenceRepo,
          ),
        },
      }),
    );

    const first = await service.issueInvoice("o1");
    expect(first.invoiceNumber).toBe("SLK/26-27/000001");
    expect(transactionInvoiceRepo.save).toHaveBeenCalledTimes(1);

    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) =>
      work({
        manager: {
          getRepository: jest.fn((entity: unknown) =>
            entity === OrderEntity
              ? { findOne: jest.fn().mockResolvedValue(order) }
              : entity === InvoiceEntity
                ? { findOne: jest.fn().mockResolvedValue({ id: "inv1", invoiceNumber: "SLK/26-27/000001", issuedAt: new Date("2026-09-19T10:00:00Z"), snapshot: first }) }
                : transactionSequenceRepo,
          ),
        },
      }),
    );
    const second = await service.issueInvoice("o1");
    expect(second.invoiceNumber).toBe("SLK/26-27/000001");
  });

  it("reuses an existing order for the same customer and idempotency key", async () => {
    const existingOrder = {
      id: "o-existing",
      customerId: "c1",
      idempotencyKey: "checkout-123",
      lineItems: [],
      statusHistory: [],
    } as unknown as OrderEntity;
    orderRepo.findOne.mockResolvedValue(existingOrder);

    const result = await service.createOrder("c1", "cart-1", { city: "Jaipur" }, " checkout-123 ");
    expect(result).toBe(existingOrder);
    expect(transactionService.runInTransaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundException for a missing order", async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await expect(service.getOrder("missing-id")).rejects.toThrow(NotFoundException);
  });

  it("allows cancellation while an order is still processing and restores stock", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "processing", lineItems: [{ variantId: "v1", quantity: 2 }], statusHistory: [] } as unknown as OrderEntity);
    const result = await service.requestCancellation("o1", "changed my mind");
    expect(result.accepted).toBe(true);
    expect(productService.adjustStock).toHaveBeenCalledWith("v1", 2, expect.any(Object), { reason: "order_cancellation", referenceType: "order", referenceId: "o1" });
  });

  it("rejects cancellation once an order has shipped", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestCancellation("o1", "too late")).rejects.toThrow(DomainException);
  });

  it("rejects a return request before delivery", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestReturn("o1", ["li1"], "wrong shade")).rejects.toThrow(DomainException);
  });

  it("persists a return request on the delivered shipment without restoring stock", async () => {
    orderRepo.findOne.mockResolvedValue({
      id: "o1",
      status: "delivered",
      lineItems: [{ id: "li1", variantId: "v1", quantity: 1 }],
      statusHistory: [{ status: "delivered", changedAt: new Date() }],
      updatedAt: new Date(),
    } as unknown as OrderEntity);
    const shipment = { id: "s1", orderId: "o1", status: "delivered" };
    const manager = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ id: "o1", status: "delivered", lineItems: [{ id: "li1" }], statusHistory: [] })
        .mockResolvedValueOnce(shipment),
      create: jest.fn((_: unknown, entity: unknown) => entity),
      save: jest.fn(async (entity: unknown) => entity),
    };
    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) => work({ manager }));
    const result = await service.requestReturn("o1", ["li1"], "wrong shade");

    expect(result.accepted).toBe(true);
    expect(shipment.status).toBe("return_requested");
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(manager.save).toHaveBeenNthCalledWith(1, shipment);
    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shipmentId: "s1",
        status: "return_requested",
        description: "wrong shade",
      }),
    );
    expect(productService.adjustStock).not.toHaveBeenCalled();
  });

  it("rejects a duplicate return request once shipment return processing has started", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "delivered", lineItems: [{ id: "li1", variantId: "v1", quantity: 1 }], statusHistory: [{ status: "delivered", changedAt: new Date() }], updatedAt: new Date() } as unknown as OrderEntity);
    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) => work({
      manager: {
        findOne: jest.fn()
          .mockResolvedValueOnce({ id: "o1", status: "delivered", lineItems: [{ id: "li1" }], statusHistory: [] })
          .mockResolvedValueOnce({ id: "s1", orderId: "o1", status: "return_requested" }),
        create: jest.fn((_: unknown, entity: unknown) => entity),
        save: jest.fn(async (entity: unknown) => entity),
      },
    }));
    await expect(service.requestReturn("o1", ["li1"], "duplicate")).rejects.toThrow(
      "A return has already been requested for this order.",
    );
  });

  it("rejects a return request when no delivered shipment exists", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "delivered", lineItems: [{ id: "li1", variantId: "v1", quantity: 1 }], statusHistory: [{ status: "delivered", changedAt: new Date() }], updatedAt: new Date() } as unknown as OrderEntity);
    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) => work({
      manager: {
        findOne: jest.fn()
          .mockResolvedValueOnce({ id: "o1", status: "delivered", lineItems: [{ id: "li1" }], statusHistory: [] })
          .mockResolvedValueOnce(null),
        create: jest.fn((_: unknown, entity: unknown) => entity),
        save: jest.fn(async (entity: unknown) => entity),
      },
    }));
    await expect(service.requestReturn("o1", ["li1"], "missing shipment")).rejects.toThrow(
      "A delivered shipment is required before a return can be requested.",
    );
  });

  it("restores stock when admin changes an order to cancelled", async () => {
    const updatedOrder = { id: "o1", status: "cancelled", lineItems: [{ variantId: "v1", quantity: 3 }], statusHistory: [] } as unknown as OrderEntity;
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "confirmed", lineItems: [{ variantId: "v1", quantity: 3 }], statusHistory: [] } as unknown as OrderEntity);

    transactionService.runInTransaction.mockImplementationOnce(async (work: (qr: unknown) => Promise<unknown>) => work({
      manager: {
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((_: unknown, entity: unknown) => entity),
        save: jest.fn((entity: unknown) => Promise.resolve(entity)),
        findOne: jest.fn().mockResolvedValueOnce({ id: "o1", status: "confirmed", lineItems: [{ variantId: "v1", quantity: 3 }], statusHistory: [] }).mockResolvedValueOnce(updatedOrder),
      },
    }));

    const result = await service.updateStatus("o1", "cancelled");
    expect(result.status).toBe("cancelled");
    expect(productService.adjustStock).toHaveBeenCalledWith("v1", 3, expect.any(Object), { reason: "order_cancellation", referenceType: "order", referenceId: "o1" });
  });
});
