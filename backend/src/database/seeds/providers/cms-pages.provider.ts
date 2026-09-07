import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CmsService } from "@/modules/cms/cms.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { CMS_PAGE_SEEDS } from "../data/cms";

const SEED_SYSTEM_ADMIN_ID = "system-seed";

@Injectable()
export class CmsPagesSeedProvider implements SeedProvider {
  readonly name = "cms-pages";
  readonly dependsOn: string[] = ["products"]; // depends on products only so internal links referencing product pages could resolve; CMS content itself doesn't reference categories/collections directly in this seed

  constructor(
    private readonly cms: CmsService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    for (const seed of CMS_PAGE_SEEDS) {
      const isNewPage = !(await this.cms.pageSlugExists(seed.slug));
      const report = await this.validation.validateCmsPageContent({
        slug: seed.slug,
        title: seed.title,
        content: seed.content,
        isDraft: false,
        isNewPage,
        internalLinks: [],
        brokenInternalLinks: [], // Sprint 7.4.9's cross-link check runs post-seed (SeedVerificationService), once every page actually exists
        bannerImageUrls: [],
        brokenBannerImageUrls: [],
        seo: { metaTitle: seed.metaTitle, metaDescription: seed.metaDescription },
      });

      if (!report.isValid) {
        outcomes.push({ naturalKey: seed.slug, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.slug, action: "created", validationReport: report });
        continue;
      }

      const { entity, wasCreated } = await this.cms.upsertStaticPage(seed);
      outcomes.push({ naturalKey: seed.slug, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.cms.deleteStaticPageById(outcome.entityId);
    }
  }
}
