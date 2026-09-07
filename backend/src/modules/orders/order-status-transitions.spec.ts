import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";
import { DomainException } from "@/common/exceptions/domain.exception";

// Sprint 4.12 — Business Rule Tests: Sprint 4.6's status-transition
// state machine, distinct from Sprint 3's OrdersService.spec.ts (which
// covered cancellation/return status gating). This file focuses on
// updateStatus's VALID_TRANSITIONS table specifically.
function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
  };
}

describe("OrdersService — status transition state machine", () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    orderRepo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OrderLineItemEntity), useValue: createMockRepo() },
        { provide: getRepositoryToken(OrderStatusHistoryEntity), useValue: createMockRepo() },
        { provide: CartService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: TransactionService, useValue: {} },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it("allows pending_payment -> confirmed", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "pending_payment", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "confirmed")).resolves.toBeDefined();
  });

  it("allows processing -> shipped", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "processing", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "shipped")).resolves.toBeDefined();
  });

  it("rejects pending_payment -> shipped (skipping steps)", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "pending_payment", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "shipped")).rejects.toThrow(DomainException);
  });

  it("rejects any transition out of a terminal state (cancelled)", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "cancelled", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "confirmed")).rejects.toThrow(DomainException);
  });

  it("rejects any transition out of a terminal state (returned)", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "returned", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "delivered")).rejects.toThrow(DomainException);
  });

  it("allows delivered -> returned", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "delivered", lineItems: [], statusHistory: [] });
    await expect(service.updateStatus("o1", "returned")).resolves.toBeDefined();
  });
});
