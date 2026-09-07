import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderEntity } from "./entities/order.entity";
import { OrderStatusHistoryEntity } from "./entities/order-status-history.entity";

// Sprint 3.9 — Mock Infrastructure: repository mocked at the boundary so
// this test exercises real business-rule logic (Phase 16 §16.8's
// cancellation/return status-gating) without a live database.
function createMockRepo<T extends object>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((entity: T) => Promise.resolve(entity)),
    create: jest.fn((entity: Partial<T>) => entity as T),
  };
}

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof createMockRepo<OrderEntity>>;

  beforeEach(async () => {
    orderRepo = createMockRepo<OrderEntity>();
    const historyRepo = createMockRepo<OrderStatusHistoryEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OrderStatusHistoryEntity), useValue: historyRepo },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  it("throws NotFoundException for a missing order", async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await expect(service.getOrder("missing-id")).rejects.toThrow(NotFoundException);
  });

  it("allows cancellation while an order is still processing", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "processing", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    const result = await service.requestCancellation("o1", "changed my mind");
    expect(result.accepted).toBe(true);
  });

  it("rejects cancellation once an order has shipped (Phase 16 §16.8)", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestCancellation("o1", "too late")).rejects.toThrow(BadRequestException);
  });

  it("rejects a return request before delivery", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "shipped", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    await expect(service.requestReturn("o1", ["li1"], "wrong shade")).rejects.toThrow(BadRequestException);
  });

  it("allows a return request after delivery", async () => {
    orderRepo.findOne.mockResolvedValue({ id: "o1", status: "delivered", lineItems: [], statusHistory: [] } as unknown as OrderEntity);
    const result = await service.requestReturn("o1", ["li1"], "wrong shade");
    expect(result.accepted).toBe(true);
  });
});
