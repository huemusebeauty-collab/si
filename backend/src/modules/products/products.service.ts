import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, OptimisticLockVersionMismatchError, Repository } from "typeorm";
import { ProductEntity, type ProductContent } from "./entities/product.entity";
import { ProductVariantEntity, type StockState } from "./entities/product-variant.entity";
import type { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { PaginatedResponse } from "@/common/dto/pagination-query.dto";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import { HttpStatus } from "@nestjs/common";
import type { CategoryEntity } from "@/modules/categories/entities/category.entity";

// Sprint 3.5 — ProductService, method signatures per Phase 16 §16.4.
// Sprint 4.2 — Product Domain: activation/deactivation, stock-driven
// availability, shade (variant) management, and the status/visibility
// rules layered on top of Sprint 3's read-only scaffold.
const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity) private readonly variants: Repository<ProductVariantEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  // getProduct(slug) -> Product (with variants, media, specs)
  async getProduct(slug: string): Promise<ProductEntity> {
    const product = await this.products.findOne({
      where: { slug, visibility: "visible" },
      relations: ["category", "variants"],
    });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  // listProducts(categoryId, filters, sort, page) -> ProductList
  async listProducts(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductEntity>> {
    const qb = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.variants", "variants")
      .where("product.visibility = :visibility", { visibility: "visible" });

    if (query.categorySlug) {
      qb.andWhere("category.slug = :slug", { slug: query.categorySlug });
    }
    if (query.sort) {
      const direction = query.sort.startsWith("-") ? "DESC" : "ASC";
      const field = query.sort.replace(/^-/, "");
      const allowed = new Set(["price", "createdAt", "name"]);
      if (allowed.has(field)) qb.orderBy(`product.${field}`, direction);
    }

    const [items, totalItems] = await qb
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return PaginatedResponse.of(items, totalItems, query.page, query.pageSize);
  }

  // getVariant(productId, variantId) -> Variant
  async getVariant(productId: string, variantId: string): Promise<ProductVariantEntity> {
    const variant = await this.variants.findOne({ where: { id: variantId, product: { id: productId } } });
    if (!variant) throw new NotFoundException("Variant not found.");
    return variant;
  }

  // checkAvailability(skuId) -> StockState
  async checkAvailability(sku: string): Promise<{ sku: string; stockState: StockState }> {
    const variant = await this.variants.findOne({ where: { sku } });
    if (!variant) throw new NotFoundException("SKU not found.");
    return { sku: variant.sku, stockState: variant.stockState };
  }

  // Sprint 6 — Admin Dashboard KPI (Phase 6 §1: "Low Stock Count").
  async getLowStockCount(): Promise<number> {
    return this.variants.count({ where: [{ stockState: "low-stock" }, { stockState: "out-of-stock" }] });
  }

  // Sprint 6 — Bulk operations (Phase 6 — implied by Product
  // Management's per-item activate/deactivate plus this sprint's own
  // "bulk operations" deliverable). Reuses `activate`/`deactivate`
  // rather than reimplementing the status-rule/cache-invalidation
  // logic — true reuse, not duplication.
  async bulkActivate(productIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of productIds) {
      try {
        await this.activate(id);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return { succeeded, failed };
  }

  async bulkDeactivate(productIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of productIds) {
      try {
        await this.deactivate(id);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return { succeeded, failed };
  }

  // Sprint 6 — Reports: Products report (Phase 6 §11 — best/worst
  // sellers). Sprint 6 scope: returns products ordered by stock
  // depletion as a proxy signal (no OrderLineItem-based sales-velocity
  // join yet) — flagged in Known Issues as a deliberate simplification,
  // not a real best-seller computation.
  async getProductsReport(): Promise<{ lowestStock: ProductVariantEntity[] }> {
    const lowestStock = await this.variants.find({ order: { stockQuantity: "ASC" }, take: 10 });
    return { lowestStock };
  }

  // Sprint 4.4 — used by CartService for real stock-quantity validation
  // at add/update time (not just the coarser StockState at checkout-time
  // validateCart). Looked up by variant ID directly since Cart only
  // holds `variantId`, not the owning product's ID (Phase 8 §4 — Cart
  // "reads product/price data, does not own it").
  async findVariantById(variantId: string): Promise<ProductVariantEntity> {
    const variant = await this.variants.findOne({ where: { id: variantId }, relations: ["product"] });
    if (!variant) throw new NotFoundException("Variant not found.");
    return variant;
  }

  // Sprint 4.3 — exposed so other modules (e.g. Collections) can look up
  // a product by ID through the service interface rather than injecting
  // ProductEntity's repository directly (Phase 8 §3's boundary rule).
  async findById(productId: string): Promise<ProductEntity> {
    return this.findProductOrThrow(productId);
  }

  // Sprint 6 — Import/Export: list-for-export and upsert-for-import.
  // Kept here rather than letting ImportExportService inject
  // ProductEntity's repository directly (Phase 8 §3 boundary rule —
  // caught in this sprint's own review before the audit script even
  // needed to flag it, same as Sprint 5's ScheduledJobsService fix).
  async listAllForExport(): Promise<ProductEntity[]> {
    return this.products.find({ relations: ["category"] });
  }

  async upsertFromImportRow(row: { slug: string; name: string; categorySlug: string; price: string }, category: CategoryEntity): Promise<ProductEntity> {
    const existing = row.slug ? await this.products.findOne({ where: { slug: row.slug } }) : null;
    const entity = existing ?? this.products.create({ slug: row.slug, status: "draft", visibility: "hidden" });
    entity.name = row.name;
    entity.category = category;
    entity.price = row.price;
    return this.products.save(entity);
  }

  // Sprint 7.3 — existence checks for ContentValidationService. Exposed
  // here (not a repository injected into the validator) per Phase 8 §3
  // module boundaries — the validator calls this service, never
  // ProductEntity's repository directly.
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.products.findOne({ where: { slug } });
    return Boolean(existing && existing.id !== excludeId);
  }

  async skuExists(sku: string, excludeVariantId?: string): Promise<boolean> {
    const existing = await this.variants.findOne({ where: { sku } });
    return Boolean(existing && existing.id !== excludeVariantId);
  }

  // Sprint 7.4 — full-content upsert for seeding: unlike
  // `upsertFromImportRow` (CSV import's minimal 4-field shape), this
  // handles the complete Phase 9 §3 content template, SEO fields, and
  // variants — reusing `addVariant` for variant creation rather than
  // duplicating its stock-state computation.
  async upsertFullProduct(data: {
    slug: string;
    name: string;
    category: CategoryEntity;
    price: number;
    salePrice?: number;
    description: string;
    content: ProductContent;
    metaTitle: string;
    metaDescription: string;
    mediaUrls: string[];
    variants: { sku: string; name: string; hexColor?: string; stockQuantity: number }[];
  }): Promise<{ entity: ProductEntity; wasCreated: boolean }> {
    const existing = await this.products.findOne({ where: { slug: data.slug }, relations: ["variants"] });
    const entity = existing ?? this.products.create({ slug: data.slug, status: "draft", visibility: "hidden" });
    entity.name = data.name;
    entity.category = data.category;
    entity.price = String(data.price);
    entity.salePrice = data.salePrice !== undefined ? String(data.salePrice) : undefined;
    entity.description = data.description;
    entity.content = data.content;
    entity.metaTitle = data.metaTitle;
    entity.metaDescription = data.metaDescription;
    entity.mediaUrls = data.mediaUrls;
    const saved = await this.products.save(entity);

    const existingSkus = new Set((existing?.variants ?? []).map((v) => v.sku));
    for (const variantSeed of data.variants) {
      if (!existingSkus.has(variantSeed.sku)) {
        await this.addVariant(saved.id, variantSeed);
      }
    }

    await this.cacheInvalidation.invalidatePrefix("products");
    return { entity: saved, wasCreated: !existing };
  }

  // Sprint 7.4.5 — for SeedProductsProvider's rollback.
  async deleteById(productId: string): Promise<void> {
    await this.variants.delete({ product: { id: productId } });
    await this.products.delete({ id: productId });
    await this.cacheInvalidation.invalidatePrefix("products");
  }

  private async findProductOrThrow(productId: string): Promise<ProductEntity> {
    const product = await this.products.findOne({ where: { id: productId }, relations: ["variants"] });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  // Sprint 4.2 — Product activation/deactivation, with a real status
  // rule: a product cannot go active with zero variants (nothing
  // purchasable), mirroring Phase 16 §16.4's visibility/status
  // independence — status governs *whether it's ever purchasable*,
  // visibility governs *whether it's currently shown*.
  async activate(productId: string): Promise<ProductEntity> {
    const product = await this.findProductOrThrow(productId);
    if (product.variants.length === 0) {
      throw new DomainException(
        DomainErrorCode.CANNOT_ACTIVATE_WITHOUT_VARIANT,
        "A product must have at least one variant before it can be activated.",
      );
    }
    product.status = "active";
    product.visibility = "visible";
    await this.products.save(product);
    await this.cacheInvalidation.invalidatePrefix("products");
    return product;
  }

  async deactivate(productId: string): Promise<ProductEntity> {
    const product = await this.findProductOrThrow(productId);
    product.status = "archived"; // Phase 8 §4 — soft-deleted/archived, never hard-deleted
    product.visibility = "hidden";
    product.archivedAt = new Date();
    await this.products.save(product);
    await this.cacheInvalidation.invalidatePrefix("products");
    return product;
  }

  // Sprint 4.2 — Shade/variant management.
  async addVariant(
    productId: string,
    data: { sku: string; name: string; hexColor?: string; stockQuantity: number },
  ): Promise<ProductVariantEntity> {
    const product = await this.findProductOrThrow(productId);
    const variant = this.variants.create({
      product,
      sku: data.sku,
      name: data.name,
      hexColor: data.hexColor,
      stockQuantity: data.stockQuantity,
      stockState: this.computeStockState(data.stockQuantity),
    });
    const saved = await this.variants.save(variant);
    await this.cacheInvalidation.invalidatePrefix("products");
    return saved;
  }

  private computeStockState(quantity: number): StockState {
    if (quantity <= 0) return "out-of-stock";
    if (quantity <= LOW_STOCK_THRESHOLD) return "low-stock";
    return "in-stock";
  }

  // Sprint 4.2/4.9 — Inventory visibility + optimistic locking. Called
  // from Cart/Order flows when stock is actually committed (not on
  // every read). `delta` is negative to decrement, positive to restore
  // (e.g. a cancelled order releasing reserved stock).
  //
  // Sprint 4.9 correction: accepts an optional `manager` so a caller
  // running inside its own transaction (e.g. OrdersService.createOrder's
  // QueryRunner) can pass that transaction's EntityManager through —
  // without this, a stock write made via this service's own injected
  // repository would run on the *default* connection, outside the
  // caller's transaction, and would NOT roll back if a later step in
  // that transaction failed. This was caught during Sprint 4's own
  // structural review, not left as a silent gap.
  async adjustStock(variantId: string, delta: number, manager?: EntityManager): Promise<ProductVariantEntity> {
    const repo = manager ? manager.getRepository(ProductVariantEntity) : this.variants;
    const variant = await repo.findOneOrFail({ where: { id: variantId } });
    const nextQuantity = variant.stockQuantity + delta;
    if (nextQuantity < 0) {
      throw new DomainException(
        DomainErrorCode.INSUFFICIENT_STOCK,
        `Only ${variant.stockQuantity} unit(s) of ${variant.sku} remain in stock.`,
      );
    }
    variant.stockQuantity = nextQuantity;
    variant.stockState = this.computeStockState(nextQuantity);
    try {
      const saved = await repo.save(variant); // fails on version mismatch — see VersionColumn on the entity
      await this.cacheInvalidation.invalidatePrefix("products");
      return saved;
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        // Sprint 4.9 — a concurrent write already changed this variant's
        // stock between our read and write; surfaced as a specific
        // domain error rather than a generic 500, so the caller (e.g.
        // Cart/Order flow) can retry with a fresh read.
        throw new DomainException(
          DomainErrorCode.STALE_WRITE_CONFLICT,
          "Stock for this shade changed while processing your request — please try again.",
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
