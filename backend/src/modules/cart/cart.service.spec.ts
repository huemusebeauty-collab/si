import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CartService } from "./cart.service";
import { CartEntity } from "./entities/cart.entity";
import { CartLineItemEntity } from "./entities/cart-line-item.entity";
import { ProductsService } from "@/modules/products/products.service";
import { DomainException } from "@/common/exceptions/domain.exception";

// Sprint 4.12 — Business Rule Tests: Cart's Sprint 4.4 stock-validation
// logic, exercised against a mocked ProductsService (no live DB needed).
function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
    delete: jest.fn(),
    update: jest.fn(),
  };
}

describe("CartService — business rules", () => {
  let service: CartService;
  let cartRepo: ReturnType<typeof createMockRepo>;
  let productsService: { findVariantById: jest.Mock };

  beforeEach(async () => {
    cartRepo = createMockRepo();
    const lineItemRepo = createMockRepo();
    productsService = { findVariantById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartEntity), useValue: cartRepo },
        { provide: getRepositoryToken(CartLineItemEntity), useValue: lineItemRepo },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it("rejects a non-integer quantity", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", lineItems: [] });
    await expect(service.addItem("c1", "v1", 1.5)).rejects.toThrow(DomainException);
  });

  it("rejects a quantity below 1", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", lineItems: [] });
    await expect(service.addItem("c1", "v1", 0)).rejects.toThrow(DomainException);
  });

  it("rejects adding more than available stock", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", lineItems: [] });
    productsService.findVariantById.mockResolvedValue({ id: "v1", name: "Muse Rose", stockQuantity: 2 });
    await expect(service.addItem("c1", "v1", 5)).rejects.toThrow(DomainException);
  });

  it("allows adding a quantity within available stock", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", lineItems: [] });
    productsService.findVariantById.mockResolvedValue({ id: "v1", name: "Muse Rose", stockQuantity: 10 });
    await expect(service.addItem("c1", "v1", 3)).resolves.toBeDefined();
  });

  it("sums existing + new quantity against stock (not just the new amount)", async () => {
    cartRepo.findOne.mockResolvedValue({
      id: "c1",
      lineItems: [{ id: "li1", variantId: "v1", quantity: 8, savedForLater: false }],
    });
    productsService.findVariantById.mockResolvedValue({ id: "v1", name: "Muse Rose", stockQuantity: 10 });
    // 8 already in cart + 5 more requested = 13, only 10 in stock -> should reject
    await expect(service.addItem("c1", "v1", 5)).rejects.toThrow(DomainException);
  });
});
