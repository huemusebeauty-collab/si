import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrderEntity } from "./entities/order.entity";
import { OrderLineItemEntity } from "./entities/order-line-item.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";
import { CartService } from "@/modules/cart/cart.service";
import { ProductsService } from "@/modules/products/products.service";
import { TransactionService } from "@/database/transaction.service";

function createMockRepo() {
  return { findOne: jest.fn(), save: jest.fn((e: unknown) => Promise.resolve(e)), create: jest.fn((e: unknown) => e) };
}

// Sprint 4.12/4.6 — Business Rule Tests: refund eligibility, new in
// Sprint 4 (Sprint 3 had no such method).
describe("OrdersService.checkRefundEligibility", () => {
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

  it("is eligible when the order status is 'returned'", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "returned", total: "18.00", lineItems: [], statusHistory: [] });
    const result = await service.checkRefundEligibility("o1");
    expect(result.eligible).toBe(true);
  });

  it("is eligible for a paid order cancelled after payment", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "cancelled", total: "18.00", lineItems: [], statusHistory: [] });
    const result = await service.checkRefundEligibility("o1");
    expect(result.eligible).toBe(true);
  });

  it("is NOT eligible for an order still pending payment", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "pending_payment", total: "18.00", lineItems: [], statusHistory: [] });
    const result = await service.checkRefundEligibility("o1");
    expect(result.eligible).toBe(false);
  });

  it("is NOT eligible for an order still processing", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "processing", total: "18.00", lineItems: [], statusHistory: [] });
    const result = await service.checkRefundEligibility("o1");
    expect(result.eligible).toBe(false);
  });
});
