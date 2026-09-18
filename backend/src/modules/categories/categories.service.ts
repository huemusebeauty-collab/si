import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

  async listAdminCategories(): Promise<CategoryEntity[]> {
    const all = await this.categories.find({ relations: ["parent"], order: { displayOrder: "ASC" } });
    return this.buildTrees(all, false);
  }

  async createCategory(data: {
    slug: string;
    name: string;
    parentId?: string | null;
    displayOrder?: number;
    visible?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }): Promise<CategoryEntity> {
    const slug = data.slug.trim().toLowerCase();
    if (await this.slugExists(slug)) throw new ConflictException("A category with this slug already exists.");
    const parent = data.parentId ? await this.findOrThrow(data.parentId) : undefined;
    const entity = this.categories.create({
      slug,
      name: data.name.trim(),
      visible: data.visible ?? true,
      displayOrder: data.displayOrder ?? 0,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      parent,
    });
    const saved = await this.categories.save(entity);
    await this.cacheInvalidation.invalidatePrefix("categories");
    return saved;
  }

  async updateCategory(categoryId: string, data: {
    slug?: string;
    name?: string;
    parentId?: string | null;
    displayOrder?: number;
    visible?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }): Promise<CategoryEntity> {
    const category = await this.findOrThrow(categoryId);
    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase();
      if (!slug) throw new BadRequestException("Category slug cannot be empty.");
      if (await this.slugExists(slug, categoryId)) throw new ConflictException("A category with this slug already exists.");
      category.slug = slug;
    }
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new BadRequestException("Category name cannot be empty.");
      category.name = name;
    }
    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) throw new BadRequestException("A category cannot be its own parent.");
      if (data.parentId) {
        const parent = await this.findOrThrow(data.parentId);
        const descendants = await this.categories.findDescendants(category);
        if (descendants.some((descendant) => descendant.id === parent.id)) {
          throw new BadRequestException("A category cannot be moved below one of its descendants.");
        }
        category.parent = parent;
      } else {
        category.parent = undefined;
      }
    }
    if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
    if (data.visible !== undefined) category.visible = data.visible;
    if (data.metaTitle !== undefined) category.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) category.metaDescription = data.metaDescription;
    const saved = await this.categories.save(category);
    await this.cacheInvalidation.invalidatePrefix("categories");
    return saved;
  }

  // getCategory(slug) -> Category (with subcategories)
  // Build from the authoritative parentId relation rather than the closure
  // table. This keeps storefront taxonomy correct even if a legacy direct
  // database update left closure-table rows stale.
  async getCategory(slug: string): Promise<CategoryEntity> {
    const all = await this.categories.find({ relations: ["parent"], order: { displayOrder: "ASC" } });
    const category = all.find((item) => item.slug === slug && item.visible);
    if (!category) throw new NotFoundException("Category not found.");
    const tree = this.buildTrees(all, true).flatMap((root) => [root, ...this.flattenTree(root)]).find((item) => item.id === category.id);
    if (!tree) throw new NotFoundException("Category not found.");
    return tree;
  }

  // listCategories() -> Category[]
  // Sprint 4.3 — visible-only, ordered by displayOrder.
  async listCategories(): Promise<CategoryEntity[]> {
    const all = await this.categories.find({ relations: ["parent"], order: { displayOrder: "ASC" } });
    return this.buildTrees(all, true);
  }

  private buildTrees(categories: CategoryEntity[], visibleOnly: boolean): CategoryEntity[] {
    const allowed = visibleOnly ? categories.filter((category) => category.visible) : categories;
    const byId = new Map(allowed.map((category) => [category.id, category]));
    allowed.forEach((category) => {
      category.children = [];
    });

    const roots: CategoryEntity[] = [];
    allowed.forEach((category) => {
      const parent = category.parent;
      if (parent && byId.has(parent.id)) {
        byId.get(parent.id)!.children.push(category);
      } else {
        roots.push(category);
      }
    });

    return roots.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private flattenTree(category: CategoryEntity): CategoryEntity[] {
    return category.children.flatMap((child) => [child, ...this.flattenTree(child)]);
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
