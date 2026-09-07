import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TreeRepository } from "typeorm";
import { CategoryEntity } from "./entities/category.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";

// Sprint 3.5 — CategoryService, method signatures per Phase 16 §16.4.
// Sprint 4.3 — visibility rules + display ordering.
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categories: TreeRepository<CategoryEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  // Sprint 7.4 — was missing entirely (categories were previously only
  // ever created via a direct-repository seed script, bypassing the
  // service layer). Added for SeedCategoriesProvider, and reusable by
  // any future admin "create category" endpoint. Uses TreeRepository's
  // `save()` (not raw insert), which correctly maintains the closure
  // table when `parent` is set.
  async upsertBySlug(data: {
    slug: string;
    name: string;
    displayOrder: number;
    metaTitle?: string;
    metaDescription?: string;
    parent?: CategoryEntity;
  }): Promise<{ entity: CategoryEntity; wasCreated: boolean }> {
    const existing = await this.categories.findOne({ where: { slug: data.slug } });
    const entity = existing ?? this.categories.create({ slug: data.slug, visible: true });
    entity.name = data.name;
    entity.displayOrder = data.displayOrder;
    entity.metaTitle = data.metaTitle;
    entity.metaDescription = data.metaDescription;
    if (data.parent) entity.parent = data.parent;
    const saved = await this.categories.save(entity);
    await this.cacheInvalidation.invalidatePrefix("categories");
    return { entity: saved, wasCreated: !existing };
  }

  // Sprint 7.4.5 — for SeedCategoriesProvider's rollback.
  async deleteById(categoryId: string): Promise<void> {
    await this.categories.delete({ id: categoryId });
    await this.cacheInvalidation.invalidatePrefix("categories");
  }

  // getCategory(slug) -> Category (with subcategories)
  async getCategory(slug: string): Promise<CategoryEntity> {
    const category = await this.categories.findOne({ where: { slug, visible: true } });
    if (!category) throw new NotFoundException("Category not found.");
    return this.categories.findDescendantsTree(category);
  }

  // listCategories() -> Category[]
  // Sprint 4.3 — visible-only, ordered by displayOrder (Phase 1 §4's
  // fixed 5-category structure benefits from stable, intentional
  // ordering rather than insertion order).
  async listCategories(): Promise<CategoryEntity[]> {
    const trees = await this.categories.findTrees();
    return trees
      .filter((c) => c.visible)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private async findOrThrow(categoryId: string): Promise<CategoryEntity> {
    const category = await this.categories.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException("Category not found.");
    return category;
  }

  // Sprint 7.3 — for ContentValidationService (Phase 8 §3 boundary rule).
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.categories.findOne({ where: { slug } });
    return Boolean(existing && existing.id !== excludeId);
  }

  // Sprint 4.3 — visibility rules.
  async setVisibility(categoryId: string, visible: boolean): Promise<CategoryEntity> {
    const category = await this.findOrThrow(categoryId);
    category.visible = visible;
    await this.categories.save(category);
    await this.cacheInvalidation.invalidatePrefix("categories");
    return category;
  }

  async setDisplayOrder(categoryId: string, displayOrder: number): Promise<CategoryEntity> {
    const category = await this.findOrThrow(categoryId);
    category.displayOrder = displayOrder;
    await this.categories.save(category);
    await this.cacheInvalidation.invalidatePrefix("categories");
    return category;
  }
}
