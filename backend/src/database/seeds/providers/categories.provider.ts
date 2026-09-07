import { Injectable } from "@nestjs/common";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../engine/seed-provider.interface";
import { CategoriesService } from "@/modules/categories/categories.service";
import { ContentValidationService } from "@/admin/content-validation/content-validation.service";
import { CATEGORY_TREE, type CategorySeedNode } from "../data/categories";
import type { CategoryEntity } from "@/modules/categories/entities/category.entity";

// Sprint 7.4.5 execution order #2 — no dependencies (settings doesn't
// gate anything category-specific).
@Injectable()
export class CategoriesSeedProvider implements SeedProvider {
  readonly name = "categories";
  readonly dependsOn: string[] = ["settings"];

  constructor(
    private readonly categories: CategoriesService,
    private readonly validation: ContentValidationService,
  ) {}

  async run(dryRun: boolean): Promise<SeedProviderResult> {
    const start = Date.now();
    const outcomes: SeedEntityOutcome[] = [];

    // Sprint 7.4.5 — main categories first (parent must exist before a
    // child references it), depth-first — this is the provider's own
    // internal ordering, distinct from SeedEngineService's cross-
    // PROVIDER ordering.
    for (const mainNode of CATEGORY_TREE) {
      const mainOutcome = await this.seedNode(mainNode, undefined, dryRun);
      outcomes.push(mainOutcome.outcome);
      const parentEntity = mainOutcome.entity;
      for (const child of mainNode.children ?? []) {
        const childOutcome = await this.seedNode(child, parentEntity, dryRun);
        outcomes.push(childOutcome.outcome);
      }
    }

    return { providerName: this.name, outcomes, durationMs: Date.now() - start };
  }

  private async seedNode(
    node: CategorySeedNode,
    parent: CategoryEntity | undefined,
    dryRun: boolean,
  ): Promise<{ outcome: SeedEntityOutcome; entity?: CategoryEntity }> {
    const report = await this.validation.validateCategoryContent({
      name: node.name,
      slug: node.slug,
      parentSlug: parent?.slug,
      visible: true,
      displayOrder: node.displayOrder,
      seo: { metaTitle: `${node.name} | Hue Muse Beauty`, metaDescription: `Shop ${node.name} at Hue Muse Beauty — premium formulas across our full ${node.name.toLowerCase()} range, crafted for everyday performance and shine.` },
    });

    if (!report.isValid) {
      return { outcome: { naturalKey: node.slug, action: "rejected-invalid", validationReport: report } };
    }
    if (dryRun) {
      return { outcome: { naturalKey: node.slug, action: "created", validationReport: report } };
    }

    const { entity, wasCreated } = await this.categories.upsertBySlug({
      slug: node.slug,
      name: node.name,
      displayOrder: node.displayOrder,
      metaTitle: `${node.name} | Hue Muse Beauty`,
      metaDescription: `Shop ${node.name} at Hue Muse Beauty — premium formulas across our full ${node.name.toLowerCase()} range, crafted for everyday performance and shine.`,
      parent,
    });

    return { outcome: { naturalKey: node.slug, action: wasCreated ? "created" : "updated", entityId: entity.id, validationReport: report }, entity };
  }

  async rollback(outcomes: SeedEntityOutcome[]): Promise<void> {
    // Sprint 7.4.5 — delete children before parents to respect the
    // closure table's foreign key constraints; reversing outcome order
    // achieves this since seedNode() always creates parents first.
    for (const outcome of [...outcomes].reverse()) {
      if (outcome.entityId) await this.categories.deleteById(outcome.entityId);
    }
  }
}
