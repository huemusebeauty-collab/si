import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { CouponsService } from "../coupons.service";
import { CouponEntity } from "../entities/coupon.entity";
import { DomainException } from "@/common/exceptions/domain.exception";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((e: unknown) => e),
    increment: jest.fn(),
    findOneOrFail: jest.fn(),
  };
}

// Sprint 6/6.10 — Business Rule Tests: coupon validation and discount
// computation, the real logic replacing Sprint 4's store-only stub.
describe("CouponsService.validateAndComputeDiscount", () => {
  let service: CouponsService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    repo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: getRepositoryToken(CouponEntity), useValue: repo }],
    }).compile();
    service = module.get(CouponsService);
  });

  const activeCoupon = (overrides: Partial<CouponEntity> = {}): CouponEntity =>
    ({
      id: "c1",
      code: "SAVE10",
      discountType: "percentage",
      discountValue: "10",
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 1000 * 60 * 60),
      active: true,
      timesRedeemed: 0,
      ...overrides,
    }) as CouponEntity;

  it("computes a percentage discount correctly", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ discountType: "percentage", discountValue: "10" }));
    const result = await service.validateAndComputeDiscount("SAVE10", 100);
    expect(result.discountAmount).toBe(10);
  });

  it("computes a fixed-amount discount correctly", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ discountType: "fixed_amount", discountValue: "15" }));
    const result = await service.validateAndComputeDiscount("FLAT15", 100);
    expect(result.discountAmount).toBe(15);
  });

  it("caps a fixed-amount discount at the subtotal (never a negative total)", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ discountType: "fixed_amount", discountValue: "50" }));
    const result = await service.validateAndComputeDiscount("BIG50", 20);
    expect(result.discountAmount).toBe(20);
  });

  it("throws for an unknown coupon code", async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.validateAndComputeDiscount("NOPE", 100)).rejects.toThrow(NotFoundException);
  });

  it("rejects an inactive coupon", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ active: false }));
    await expect(service.validateAndComputeDiscount("SAVE10", 100)).rejects.toThrow(DomainException);
  });

  it("rejects a coupon before its start date", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ startAt: new Date(Date.now() + 1000 * 60 * 60) }));
    await expect(service.validateAndComputeDiscount("SAVE10", 100)).rejects.toThrow(DomainException);
  });

  it("rejects a coupon past its end date", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ endAt: new Date(Date.now() - 1000) }));
    await expect(service.validateAndComputeDiscount("SAVE10", 100)).rejects.toThrow(DomainException);
  });

  it("rejects a coupon that has reached its usage limit", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ usageLimit: 5, timesRedeemed: 5 }));
    await expect(service.validateAndComputeDiscount("SAVE10", 100)).rejects.toThrow(DomainException);
  });

  it("allows a coupon under its usage limit", async () => {
    repo.findOne.mockResolvedValue(activeCoupon({ usageLimit: 5, timesRedeemed: 4 }));
    await expect(service.validateAndComputeDiscount("SAVE10", 100)).resolves.toBeDefined();
  });
});
