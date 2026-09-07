import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CmsService } from "@/modules/cms/cms.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { BANNER_SEEDS } from "../data/banners";

@Injectable()
export class BannersSeedProvider implements SeedProvider {
  readonly name = "banners";
  readonly dependsOn: string[] = ["faqs"];

  constructor(
    private readonly cms: CmsService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];
    const now = new Date();

    for (const seed of BANNER_SEEDS) {
      const startAt = now;
      const endAt = new Date(now.getTime() + seed.daysActive * 24 * 60 * 60 * 1000);
      const report = await this.validation.validateBannerContent({
        placement: seed.placement,
        imageUrl: seed.imageUrl,
        imageAltText: seed.imageAltText,
        headline: seed.headline,
        ctaUrl: seed.ctaUrl,
        ctaUrlIsBroken: false, // Sprint 7.4.9's post-seed verification checks real link resolution
        startAt,
        endAt,
      });

      const naturalKey = `${seed.placement}:${seed.headline}`;
      if (!report.isValid) {
        outcomes.push({ naturalKey, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey, action: "created", validationReport: report });
        continue;
      }
      const { entity, wasCreated } = await this.cms.upsertBanner({ ...seed, startAt, endAt });
      outcomes.push({ naturalKey, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.cms.deleteBannerById(outcome.entityId);
    }
  }
}
