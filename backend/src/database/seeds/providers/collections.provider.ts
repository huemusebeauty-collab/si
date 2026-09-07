import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CollectionsService } from "@/modules/collections/collections.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { COLLECTION_SEEDS } from "../data/collections";

// Sprint 7.4.5 execution order #3 — Collections seed before Products
// (which reference collection slugs), but the actual product<->collection
// ASSIGNMENT happens in ProductsSeedProvider (a collection must exist
// with zero products before any product can be assigned to it — the
// validator's COLLECTION_NO_PRODUCTS warning is therefore expected and
// non-fatal at this stage, resolved once ProductsSeedProvider runs).
@Injectable()
export class CollectionsSeedProvider implements SeedProvider {
  readonly name = "collections";
  readonly dependsOn: string[] = ["categories"];

  constructor(
    private readonly collections: CollectionsService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    for (const seed of COLLECTION_SEEDS) {
      const report = await this.validation.validateCollectionContent({
        name: seed.name,
        slug: seed.slug,
        featured: seed.featured,
        productIds: [], // see class comment — genuinely empty at this stage
        displayOrder: seed.displayOrder,
        seo: { metaTitle: seed.metaTitle, metaDescription: seed.metaDescription },
      });

      // Sprint 7.4.6 — "Reject entities with validation errors ... record
      // warnings separately": COLLECTION_NO_PRODUCTS is a warning, not an
      // error, so it does NOT block insertion — only actual errors do.
      if (!report.isValid) {
        outcomes.push({ naturalKey: seed.slug, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.slug, action: "created", validationReport: report });
        continue;
      }

      const { entity, wasCreated } = await this.collections.upsertBySlug({
        slug: seed.slug,
        name: seed.name,
        tagline: seed.tagline,
        featured: seed.featured,
        displayOrder: seed.displayOrder,
        metaTitle: seed.metaTitle,
        metaDescription: seed.metaDescription,
      });
      outcomes.push({ naturalKey: seed.slug, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.collections.deleteById(outcome.entityId);
    }
  }
}
