import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo<T extends object>() {
  return { findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn(), save: jest.fn((entity: T) => Promise.resolve(entity)), create: jest.fn((entity: Partial<T>) => entity as T) };
}

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof createMockRepo<OrderEntity>>;
  let historyRepo: ReturnType<typeof createMockRepo<OrderStatusHistoryEntity>>;
  let productService: { adjustStock: jest.Mock; findVariantById: jest.Mock; listInventory: jest.Mock };
  let transactionService: { runInTransaction: jest.Mock };

  beforeEach(async () => {
    orderRepo = createMockRepo<OrderEntity>();
    historyRepo = createMockRepo<OrderStatusHistoryEntity>();
    productService = { adjustStock: jest.fn(), findVariantById: jest.fn(), listInventory: jest.fn() };
    const manager = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_: unknown, entity: unknown) => entity),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue({ id: "o1", status: "processing", lineItems: [{ variantId: "v1", quantity: 2 }], statusHistory: [] }),
    };
    transactionService = { runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OrderLineItemEntity), useValue: createMockRepo<OrderLineItemEntity>() },
        { provide: getRepositoryToken(OrderStatusHistoryEntity), useValue: historyRepo },
        { provide: CartService, useValue: {} },
        { provide: ProductsService, useValue: productService },
        { provide: TransactionService, useValue: transactionService },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it("throws NotFoundException for a missing order", async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await expect(service.getOrder("missing-id")).rejects.toThrow(NotFoundException);
  });

  it("allows cancellation while an order is still processing and restores stock", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "processing", lineItems: [{ variantId: "v1", quantity: 2 }], statusHistory: [] } as unknown as OrderEntity);
    const result = await service.requestCancellation("o1", "changed my mind");
    expect(result.accepted).toBe(true);
    expect(productService.adjustStock).toHaveBeenCalledWith("v1", 2, expect.any(Object));
  });

  it("rejects cancellation once an order has shipped", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestCancellation("o1", "too late")).rejects.toThrow(DomainException);
  });

  it("rejects a return request before delivery", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestReturn("o1", ["li1"], "wrong shade")).rejects.toThrow(DomainException);
  });

  it("allows a return request after delivery", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "delivered", lineItems: [], statusHistory: [{ status: "delivered", changedAt: new Date() }], updatedAt: new Date() } as unknown as OrderEntity);
    const result = await service.requestReturn("o1", ["li1"], "wrong shade");
    expect(result.accepted).toBe(true);
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
    expect(productService.adjustStock).toHaveBeenCalledWith("v1", 3, expect.any(Object));
  });
});
