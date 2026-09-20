import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CartService } from "./cart.service";
import { CartEntity } from "./entities/cart.entity";
import { CartLineItemEntity } from "./entities/cart-line-item.entity";
import { ProductsService } from "@/modules/products/products.service";
import { DomainException } from "@/common/exceptions/domain.exception";
import { CouponsService } from "@/admin/coupons/coupons.service";
import { SettingsService } from "@/admin/settings/settings.service";

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
        { provide: CouponsService, useValue: { validateAndComputeDiscount: jest.fn() } },
        { provide: SettingsService, useValue: { isFeatureEnabled: jest.fn() } },
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


  it("rejects access to a cart when neither the session nor authenticated user owns it", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", customerId: "owner-1", sessionId: "session-owner", lineItems: [] });

    await expect(service.findById("c1", { userId: "attacker-1", sessionId: "session-attacker" }))
      .rejects.toThrow("You do not have access to this cart.");
  });

  it("allows an authenticated customer to access their own cart without a guest session header", async () => {
    cartRepo.findOne.mockResolvedValue({ id: "c1", customerId: "owner-1", sessionId: "session-owner", lineItems: [] });

    await expect(service.findById("c1", { userId: "owner-1" })).resolves.toMatchObject({ id: "c1" });
  });

  it("requires both authenticated ownership and matching guest session for cart merge", async () => {
    await expect(
      service.mergeGuestCart("guest-session", "customer-1", { sessionId: "other-session", userId: "customer-1" }),
    ).rejects.toThrow("Cart merge ownership could not be verified.");

    await expect(
      service.mergeGuestCart("guest-session", "customer-1", { sessionId: "guest-session", userId: "other-customer" }),
    ).rejects.toThrow("Cart merge ownership could not be verified.");
  });

  it("merges a guest cart only for the authenticated customer", async () => {
    const guestCart = {
      id: "guest-cart",
      sessionId: "guest-session",
      lineItems: [{ id: "guest-line", variantId: "v1", quantity: 2, savedForLater: false }],
    };
    const customerCart = {
      id: "customer-cart",
      customerId: "customer-1",
      lineItems: [{ id: "customer-line", variantId: "v1", quantity: 3, savedForLater: false }],
    };
    cartRepo.findOne
      .mockResolvedValueOnce(guestCart)
      .mockResolvedValueOnce(customerCart)
      .mockResolvedValueOnce({ ...customerCart, lineItems: [{ ...customerCart.lineItems[0], quantity: 5 }] });

    await expect(
      service.mergeGuestCart("guest-session", "customer-1", { sessionId: "guest-session", userId: "customer-1" }),
    ).resolves.toMatchObject({ id: "customer-cart" });

    expect(lineItemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: "customer-line", quantity: 5 }));
    expect(cartRepo.delete).toHaveBeenCalledWith("guest-cart");
  });
