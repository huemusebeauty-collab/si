import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionEntity } from "./entities/collection.entity";
import { ProductsService } from "@/modules/products/products.service";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";

// Sprint 3.5 — CollectionService, method signatures per Phase 16 §16.4.
// Sprint 4.3 — Category & Collection: collection assignment, featured
// collections, and display ordering layered on top.
//
// Sprint 4.14 correction: originally injected ProductEntity's repository
// directly to look up a product for assignProduct/unassignProduct — the
// Sprint 4 structural audit (same pattern as Sprint 3's) flagged this as
// a real Phase 8 §3 boundary violation (Collections reaching into
// Products' owned data table). Fixed to go through ProductsService
// instead, caught and corrected during this sprint's own review rather
// than left in.
@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(CollectionEntity) private readonly collections: Repository<CollectionEntity>,
    private readonly products: ProductsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  // Sprint 7.4 — was missing entirely (same gap class as
  // CategoriesService — collections were previously only creatable via
  // direct-repository seed access). Added for SeedCollectionsProvider.
  async upsertBySlug(data: {
    slug: string;
    name: string;
    tagline: string;
    featured: boolean;
    displayOrder: number;
    metaTitle?: string;
    metaDescription?: string;
    startAt?: Date;
    endAt?: Date;
  }): Promise<{ entity: CollectionEntity; wasCreated: boolean }> {
    const existing = await this.collections.findOne({ where: { slug: data.slug } });
    const entity = existing ?? this.collections.create({ slug: data.slug, active: true, products: [] });
    Object.assign(entity, data);
    const saved = await this.collections.save(entity);
    await this.cacheInvalidation.invalidatePrefix("collections");
    return { entity: saved, wasCreated: !existing };
  }

  // Sprint 7.4.5 — for SeedCollectionsProvider's rollback.
  async deleteById(collectionId: string): Promise<void> {
    await this.collections.delete({ id: collectionId });
    await this.cacheInvalidation.invalidatePrefix("collections");
  }

  // getCollection(slug) -> Collection (with member products)
  async getCollection(slug: string): Promise<CollectionEntity> {
    const collection = await this.collections.findOne({ where: { slug, active: true }, relations: ["products"] });
    if (!collection) throw new NotFoundException("Collection not found.");
    return collection;
  }

  // listActiveCollections(type?) -> Collection[]
  // Sprint 4.3 — ordered by displayOrder, optionally filtered to
  // featured-only when type === "featured" (the closest fit to Phase
  // 16 §16.4's reserved `type?` parameter without inventing new schema
  // beyond what Sprint 4.3 actually asks for).
  async listActiveCollections(type?: string): Promise<CollectionEntity[]> {
    return this.collections.find({
      where: type === "featured" ? { active: true, featured: true } : { active: true },
      order: { displayOrder: "ASC" },
    });
  }

  private async findOrThrow(collectionId: string): Promise<CollectionEntity> {
    const collection = await this.collections.findOne({ where: { id: collectionId }, relations: ["products"] });
    if (!collection) throw new NotFoundException("Collection not found.");
    return collection;
  }

  // Sprint 7.3 — for ContentValidationService (Phase 8 §3 boundary rule).
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.collections.findOne({ where: { slug } });
    return Boolean(existing && existing.id !== excludeId);
  }

  // Sprint 4.3 — Collection assignment: add/remove a product from a
  // collection. References Products by ID only (Phase 8 §4) — never
  // duplicates product content onto the Collection entity.
  async assignProduct(collectionId: string, productId: string): Promise<CollectionEntity> {
    const collection = await this.findOrThrow(collectionId);
    const product = await this.products.findById(productId);
    const already = collection.products.some((p) => p.id === productId);
    if (!already) {
      collection.products.push(product);
      await this.collections.save(collection);
    }
    await this.cacheInvalidation.invalidatePrefix("collections");
    return this.findOrThrow(collectionId);
  }

  async unassignProduct(collectionId: string, productId: string): Promise<CollectionEntity> {
    const collection = await this.findOrThrow(collectionId);
    collection.products = collection.products.filter((p) => p.id !== productId);
    await this.collections.save(collection);
    await this.cacheInvalidation.invalidatePrefix("collections");
    return this.findOrThrow(collectionId);
  }

  // Sprint 4.3 — featured toggle + display ordering.
  async setFeatured(collectionId: string, featured: boolean): Promise<CollectionEntity> {
    const collection = await this.findOrThrow(collectionId);
    collection.featured = featured;
    await this.collections.save(collection);
    await this.cacheInvalidation.invalidatePrefix("collections");
    return collection;
  }

  async setDisplayOrder(collectionId: string, displayOrder: number): Promise<CollectionEntity> {
    const collection = await this.findOrThrow(collectionId);
    collection.displayOrder = displayOrder;
    await this.collections.save(collection);
    await this.cacheInvalidation.invalidatePrefix("collections");
    return collection;
  }
}
