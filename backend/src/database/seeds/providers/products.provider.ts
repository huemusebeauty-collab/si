import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { ProductsService } from "@/modules/products/products.service";
import { CategoriesService } from "@/modules/categories/categories.service";
import { CollectionsService } from "@/modules/collections/collections.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { PRODUCT_SEEDS } from "../data/products";

// Sprint 7.4.5 execution order #4 — depends on both categories (every
// product references one) and collections (products are assigned to
// zero or more, after both already exist).
@Injectable()
export class ProductsSeedProvider implements SeedProvider {
  readonly name = "products";
  readonly dependsOn: string[] = ["categories", "collections"];

  constructor(
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly collections: CollectionsService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    for (const seed of PRODUCT_SEEDS) {
      const existing = await this.products.getProduct(seed.slug).catch(() => null);

      const report = await this.validation.validateProductContent({
        productId: existing?.id,
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        content: seed.content,
        price: seed.price,
        salePrice: seed.salePrice,
        variants: seed.variants.map((v) => ({ sku: v.sku, name: v.name, stockQuantity: v.stockQuantity, variantId: existing?.variants.find((ev) => ev.sku === v.sku)?.id })),
        mediaUrls: seed.mediaUrls,
        seo: { metaTitle: seed.metaTitle, metaDescription: seed.metaDescription },
      });

      // Sprint 7.4.6 — "Continue processing other entities unless a
      // fatal dependency fails": one invalid product is recorded and
      // skipped; it does not abort the rest of the catalog.
      if (!report.isValid) {
        outcomes.push({ naturalKey: seed.slug, action: "rejected-invalid", validationReport: report });
        continue;
      }
      if (dryRun) {
        outcomes.push({ naturalKey: seed.slug, action: "created", validationReport: report });
        continue;
      }

      const category = await this.categories.getCategory(seed.categorySlug).catch(() => null);
      if (!category) {
        // Sprint 7.4.6 — "a fatal dependency fails": a product whose
        // category doesn't exist can't be created at all — recorded as
        // rejected rather than thrown, so one missing category doesn't
        // abort the whole provider (categories are a hard prerequisite
        // per-product, not per-provider — the provider-level dependency
        // graph already guarantees the categories PROVIDER ran first;
        // this handles the narrower case of one specific bad slug).
        outcomes.push({ naturalKey: seed.slug, action: "rejected-invalid", validationReport: report });
        continue;
      }

      const { entity, wasCreated } = await this.products.upsertFullProduct({
        slug: seed.slug,
        name: seed.name,
        category,
        price: seed.price,
        salePrice: seed.salePrice,
        description: seed.description,
        content: seed.content,
        metaTitle: seed.metaTitle,
        metaDescription: seed.metaDescription,
        mediaUrls: seed.mediaUrls,
        variants: seed.variants,
      });

      // Sprint 7.4.7 — "Avoid duplicate media references": mediaUrls are
      // set wholesale by upsertFullProduct (overwritten, not appended)
      // on every run, so a repeated seed execution never accumulates
      // duplicate entries in the array.
      for (const collectionSlug of seed.collectionSlugs) {
        const collection = await this.collections.getCollection(collectionSlug).catch(() => null);
        if (collection && !collection.products.some((p) => p.id === entity.id)) {
          await this.collections.assignProduct(collection.id, entity.id);
        }
      }

      outcomes.push({ naturalKey: seed.slug, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report });
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    for (const outcome of outcomes) {
      if (outcome.entityId) await this.products.deleteById(outcome.entityId);
    }
  }
}
