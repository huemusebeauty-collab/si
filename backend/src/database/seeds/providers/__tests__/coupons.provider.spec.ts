import { CouponsSeedProvider } from "../coupons.provider";

// Sprint 7.4.10 — "Validation failures": exercises the inline coupon
// validation (documented in coupons.provider.ts as intentionally
// outside the Sprint 7.3 Content Validation Engine's scope) directly,
// via the provider's private `validate` method — accessed through a
// cast since it's deliberately not part of the SeedProvider public
// interface.
describe("CouponsSeedProvider validation", () => {
  const provider = new CouponsSeedProvider({} as never) as unknown as {
    validate: (seed: { code: string; discountType: "percentage" | "fixed_amount"; discountValue: number; daysActive: number; usageLimit?: number }, startAt: Date, endAt: Date) => { isValid: boolean; issues: { code: string }[] };
  };

  const validSeed = { code: "SAVE10", discountType: "percentage" as const, discountValue: 10, daysActive: 30 };

  it("passes a valid coupon", () => {
    const report = provider.validate(validSeed, new Date(), new Date(Date.now() + 1000));
    expect(report.isValid).toBe(true);
  });

  it("rejects a missing code", () => {
    const report = provider.validate({ ...validSeed, code: "" }, new Date(), new Date(Date.now() + 1000));
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.code === "COUPON_MISSING_CODE")).toBe(true);
  });

  it("rejects an invalid date range (end before start)", () => {
    const report = provider.validate(validSeed, new Date(2026, 5, 1), new Date(2026, 0, 1));
    expect(report.issues.some((i) => i.code === "COUPON_INVALID_DATE_RANGE")).toBe(true);
  });

  it("rejects a zero or negative discount value", () => {
    const report = provider.validate({ ...validSeed, discountValue: 0 }, new Date(), new Date(Date.now() + 1000));
    expect(report.issues.some((i) => i.code === "COUPON_INVALID_DISCOUNT_VALUE")).toBe(true);
  });

  it("rejects a percentage discount over 100 (boundary: 101)", () => {
    const report = provider.validate({ ...validSeed, discountValue: 101 }, new Date(), new Date(Date.now() + 1000));
    expect(report.issues.some((i) => i.code === "COUPON_PERCENTAGE_OVER_100")).toBe(true);
  });

  it("allows a percentage discount at exactly 100 (boundary)", () => {
    const report = provider.validate({ ...validSeed, discountValue: 100 }, new Date(), new Date(Date.now() + 1000));
    expect(report.issues.some((i) => i.code === "COUPON_PERCENTAGE_OVER_100")).toBe(false);
  });

  it("allows a fixed-amount discount over 100 (the >100 rule is percentage-only)", () => {
    const report = provider.validate({ ...validSeed, discountType: "fixed_amount", discountValue: 150 }, new Date(), new Date(Date.now() + 1000));
    expect(report.isValid).toBe(true);
  });
});
