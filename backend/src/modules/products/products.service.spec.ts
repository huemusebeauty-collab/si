import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OptimisticLockVersionMismatchError } from "typeorm";
import { ProductsService } from "./products.service";
import { ProductEntity } from "./entities/product.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
  };
}

// Sprint 4.12/4.2/4.9 — Business Rule Tests: stock adjustment (Sprint
// 4.2's inventory rules) and optimistic-lock conflict translation
// (Sprint 4.9).
describe("ProductsService — stock adjustment", () => {
  let service: ProductsService;
  let variantRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    variantRepo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(ProductEntity), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductVariantEntity), useValue: variantRepo },
        { provide: CacheInvalidationService, useValue: { invalidatePrefix: jest.fn() } },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it("decrements stock and recomputes stockState", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 15, stockState: "in-stock" });
    const result = await service.adjustStock("v1", -10);
    expect(result.stockQuantity).toBe(5);
    expect(result.stockState).toBe("low-stock"); // <= 10 threshold
  });

  it("transitions to out-of-stock at zero", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 3, stockState: "low-stock" });
    const result = await service.adjustStock("v1", -3);
    expect(result.stockQuantity).toBe(0);
    expect(result.stockState).toBe("out-of-stock");
  });

  it("rejects a decrement that would go negative (insufficient stock)", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 2, stockState: "low-stock" });
    await expect(service.adjustStock("v1", -5)).rejects.toThrow(DomainException);
  });

  it("translates a concurrent-write conflict into a DomainException", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 10, stockState: "in-stock" });
    variantRepo.save.mockRejectedValue(new OptimisticLockVersionMismatchError("ProductVariantEntity", 1, 2));
    await expect(service.adjustStock("v1", -1)).rejects.toThrow(DomainException);
  });

  it("allows a positive delta (stock restoration, e.g. order cancellation)", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 0, stockState: "out-of-stock" });
    const result = await service.adjustStock("v1", 5);
    expect(result.stockQuantity).toBe(5);
    expect(result.stockState).toBe("low-stock");
  });
});
