export interface CouponSeed {
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  daysActive: number;
  usageLimit?: number;
}

export const COUPON_SEEDS: CouponSeed[] = [
  { code: "WELCOME10", discountType: "percentage", discountValue: 10, daysActive: 90 },
  { code: "FREESHIP", discountType: "fixed_amount", discountValue: 6, daysActive: 60, usageLimit: 500 },
  { code: "HOLIDAY20", discountType: "percentage", discountValue: 20, daysActive: 30, usageLimit: 200 },
];
