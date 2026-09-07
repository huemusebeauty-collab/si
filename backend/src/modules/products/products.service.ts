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

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity) private readonly variants: Repository<ProductVariantEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async getProduct(slug: string): Promise<ProductEntity> {
    const product = await this.products.findOne({
      where: { slug, visibility: "visible" },
      relations: ["category", "variants"],
    });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  async listProducts(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductEntity>> {
    const qb = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.variants", "variants")
      .where("product.visibility = :visibility", { visibility: "visible" });

    if (query.categorySlug) qb.andWhere("category.slug = :slug", { slug: query.categorySlug });
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

  async getVariant(productId: string, variantId: string): Promise<ProductVariantEntity> {
    const variant = await this.variants.findOne({ where: { id: variantId, product: { id: productId } } });
    if (!variant) throw new NotFoundException("Variant not found.");
    return variant;
  }

  async checkAvailability(sku: string): Promise<{ sku: string; stockState: StockState }> {
    const variant = await this.variants.findOne({ where: { sku } });
    if (!variant) throw new NotFoundException("SKU not found.");
    return { sku: variant.sku, stockState: variant.stockState };
  }

  async getLowStockCount(): Promise<number> {
    return this.variants.count({ where: [{ stockState: "low-stock" }, { stockState: "out-of-stock" }] });
  }

  // Admin inventory view: one row per sellable SKU/variant, including its
  // product and category so the dashboard can manage stock without
  // exposing repositories directly to the controller.
  async listInventory(): Promise<Array<{
    id: string;
    sku: string;
    name: string;
    stockQuantity: number;
    stockState: StockState;
    version: number;
    product: { id: string; name: string; slug: string; category: string };
  }>> {
    const variants = await this.variants.find({
      relations: ["product", "product.category"],
      order: { stockQuantity: "ASC" },
    });
    return variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      stockQuantity: variant.stockQuantity,
      stockState: variant.stockState,
      version: variant.version,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        slug: variant.product.slug,
        category: variant.product.category?.name ?? "Uncategorized",
      },
    }));
  }

  // Admin inventory adjustment. Uses the same stock-state calculation and
  // optimistic-locking path used by checkout, so manual stock edits obey
  // exactly the same inventory rules.
  async setStock(variantId: string, quantity: number, expectedVersion?: number): Promise<ProductVariantEntity> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new DomainException(DomainErrorCode.INSUFFICIENT_STOCK, "Stock quantity must be a non-negative integer.");
    }
    const variant = await this.variants.findOne({ where: { id: variantId }, relations: ["product"] });
    if (!variant) throw new NotFoundException("Variant not found.");
    if (expectedVersion !== undefined && variant.version !== expectedVersion) {
      throw new DomainException(
        DomainErrorCode.STALE_WRITE_CONFLICT,
        "Stock changed while you were editing it — refresh and try again.",
        HttpStatus.CONFLICT,
      );
    }
    variant.stockQuantity = quantity;
    variant.stockState = this.computeStockState(quantity);
    const saved = await this.variants.save(variant);
    await this.cacheInvalidation.invalidatePrefix("products");
    return saved;
  }

  async bulkActivate(productIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of productIds) {
      try { await this.activate(id); succeeded.push(id); }
      catch (error) { failed.push({ id, reason: error instanceof Error ? error.message : String(error) }); }
    }
    return { succeeded, failed };
  }

  async bulkDeactivate(productIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of productIds) {
      try { await this.deactivate(id); succeeded.push(id); }
      catch (error) { failed.push({ id, reason: error instanceof Error ? error.message : String(error) }); }
    }
    return { succeeded, failed };
  }

  async getProductsReport(): Promise<{ lowestStock: ProductVariantEntity[] }> {
    const lowestStock = await this.variants.find({ order: { stockQuantity: "ASC" }, take: 10 });
    return { lowestStock };
  }

  async findVariantById(variantId: string): Promise<ProductVariantEntity> {
    const variant = await this.variants.findOne({ where: { id: variantId }, relations: ["product"] });
    if (!variant) throw new NotFoundException("Variant not found.");
    return variant;
  }

  async findById(productId: string): Promise<ProductEntity> { return this.findProductOrThrow(productId); }

  async listAllForExport(): Promise<ProductEntity[]> { return this.products.find({ relations: ["category"] }); }

  async upsertFromImportRow(row: { slug: string; name: string; categorySlug: string; price: string }, category: CategoryEntity): Promise<ProductEntity> {
    const existing = row.slug ? await this.products.findOne({ where: { slug: row.slug } }) : null;
    const entity = existing ?? this.products.create({ slug: row.slug, status: "draft", visibility: "hidden" });
    entity.name = row.name;
    entity.category = category;
    entity.price = row.price;
    return this.products.save(entity);
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.products.findOne({ where: { slug } });
    return Boolean(existing && existing.id !== excludeId);
  }

  async skuExists(sku: string, excludeVariantId?: string): Promise<boolean> {
    const existing = await this.variants.findOne({ where: { sku } });
    return Boolean(existing && existing.id !== excludeVariantId);
  }

  async upsertFullProduct(data: {
    slug: string; name: string; category: CategoryEntity; price: number; salePrice?: number;
    description: string; content: ProductContent; metaTitle: string; metaDescription: string;
    mediaUrls: string[]; variants: { sku: string; name: string; hexColor?: string; stockQuantity: number }[];
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
    for (const variantSeed of data.variants) if (!existingSkus.has(variantSeed.sku)) await this.addVariant(saved.id, variantSeed);
    await this.cacheInvalidation.invalidatePrefix("products");
    return { entity: saved, wasCreated: !existing };
  }

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

  async activate(productId: string): Promise<ProductEntity> {
    const product = await this.findProductOrThrow(productId);
    if (product.variants.length === 0) {
      throw new DomainException(DomainErrorCode.CANNOT_ACTIVATE_WITHOUT_VARIANT, "A product must have at least one variant before it can be activated.");
    }
    product.status = "active";
    product.visibility = "visible";
    await this.products.save(product);
    await this.cacheInvalidation.invalidatePrefix("products");
    return product;
  }

  async deactivate(productId: string): Promise<ProductEntity> {
    const product = await this.findProductOrThrow(productId);
    product.status = "archived";
    product.visibility = "hidden";
    product.archivedAt = new Date();
    await this.products.save(product);
    await this.cacheInvalidation.invalidatePrefix("products");
    return product;
  }

  async addVariant(productId: string, data: { sku: string; name: string; hexColor?: string; stockQuantity: number }): Promise<ProductVariantEntity> {
    const product = await this.findProductOrThrow(productId);
    const variant = this.variants.create({ product, sku: data.sku, name: data.name, hexColor: data.hexColor, stockQuantity: data.stockQuantity, stockState: this.computeStockState(data.stockQuantity) });
    const saved = await this.variants.save(variant);
    await this.cacheInvalidation.invalidatePrefix("products");
    return saved;
  }

  private computeStockState(quantity: number): StockState {
    if (quantity <= 0) return "out-of-stock";
    if (quantity <= LOW_STOCK_THRESHOLD) return "low-stock";
    return "in-stock";
  }

  async adjustStock(variantId: string, delta: number, manager?: EntityManager): Promise<ProductVariantEntity> {
    const repo = manager ? manager.getRepository(ProductVariantEntity) : this.variants;
    const variant = await repo.findOneOrFail({ where: { id: variantId } });
    const nextQuantity = variant.stockQuantity + delta;
    if (nextQuantity < 0) throw new DomainException(DomainErrorCode.INSUFFICIENT_STOCK, `Only ${variant.stockQuantity} unit(s) of ${variant.sku} remain in stock.`);
    variant.stockQuantity = nextQuantity;
    variant.stockState = this.computeStockState(nextQuantity);
    try {
      const saved = await repo.save(variant);
      await this.cacheInvalidation.invalidatePrefix("products");
      return saved;
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new DomainException(DomainErrorCode.STALE_WRITE_CONFLICT, "Stock for this shade changed while processing your request — please try again.", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }
}