import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CouponsService } from "@/admin/coupons/coupons.service";
import { COUPON_SEEDS } from "../data/coupons";
import type { ValidationIssue, ValidationReport } from "@/admin/content-validation/validation-result";
import { buildReport } from "@/admin/content-validation/validation-result";

// Sprint 7.4.5 — Coupons has no dedicated ContentValidationService
// method (Sprint 7.3's own spec named 8 content types — Product,
// Category, Collection, CMS, FAQ, Banner, Notification Template, SEO —
// and Coupons was not among them). This provider does its own minimal,
// inline validation (date-range sanity, non-empty code) rather than
// extending the Sprint 7.3 engine's scope retroactively — a deliberate
// boundary, not an oversight, documented here and in Known Issues.
@Injectable()
export class CouponsSeedProvider implements SeedProvider {
  readonly name = "coupons";
  readonly dependsOn: string[] = ["banners"];

  constructor(private readonly coupons: CouponsService) {}

  private validate(seed: (typeof COUPON_SEEDS)[number], startAt: Date, endAt: Date): ValidationReport {
    const issues: ValidationIssue[] = [];
    if (!seed.code) issues.push({ severity: "error", code: "COUPON_MISSING_CODE", message: "Coupon code is required." });
    if (startAt >= endAt) issues.push({ severity: "error", code: "COUPON_INVALID_DATE_RANGE", message: "Start date must be before end date." });
    if (seed.discountValue <= 0) issues.push({ severity: "error", code: "COUPON_INVALID_DISCOUNT_VALUE", message: "Discount value must be greater than zero." });
    if (seed.discountType === "percentage" && seed.discountValue > 100) issues.push({ severity: "error", code: "COUPON_PERCENTAGE_OVER_100", message: "Percentage discount cannot exceed 100." });
    return buildReport("coupon", issues, seed.code);
  }

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];
    const now = new Date();

    for (const seed of COUPON_SEEDS) {
      const startAt = now;
      const endAt = new Date(now.getTime() + seed.daysActive * 24 * 60 * 60 * 1000);
      const report = this.validate(seed, startAt, endAt);

      if (!report.isValid) {
        outcomes.push({ naturalKey: seed.code, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.code, action: "created", validationReport: report });
        continue;
      }
      const { entity, wasCreated } = await this.coupons.upsertByCode({ ...seed, startAt, endAt });
      outcomes.push({ naturalKey: seed.code, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.coupons.deleteById(outcome.entityId);
    }
  }
}
