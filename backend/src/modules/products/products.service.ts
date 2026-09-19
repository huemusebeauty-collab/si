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
import { CategoriesService } from "@/modules/categories/categories.service";
import { TransactionService } from "@/database/transaction.service";

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity) private readonly variants: Repository<ProductVariantEntity>,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly categoriesService: CategoriesService,
    private readonly transactions: TransactionService,
  ) {}

  async getProduct(slug: string): Promise<ProductEntity> {
    const product = await this.products.findOne({
      where: { slug, visibility: "visible" },
      relations: ["category", "variants"],
    });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  async listAdminProducts(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductEntity>> {
    const qb = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.variants", "variants");

    if (query.categorySlug) {
      const category = await this.categoriesService.getCategory(query.categorySlug);
      const categoryIds = [category.id, ...this.flattenCategoryIds(category.children)];
      qb.andWhere("category.id IN (:...categoryIds)", { categoryIds });
    }

    if (query.sort) {
      const direction = query.sort.startsWith("-") ? "DESC" : "ASC";
      const field = query.sort.replace(/^-/, "");
      const allowed = new Set(["price", "createdAt", "name"]);
      if (allowed.has(field)) qb.orderBy(`product.${field}`, direction);
    } else {
      qb.orderBy("product.createdAt", "DESC");
    }

    const [items, totalItems] = await qb
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return PaginatedResponse.of(items, totalItems, query.page, query.pageSize);
  }

  async listProducts(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductEntity>> {
    const qb = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.variants", "variants")
      .where("product.visibility = :visibility", { visibility: "visible" });

    if (query.categorySlug) {
      const category = await this.categoriesService.getCategory(query.categorySlug);
      const categoryIds = [category.id, ...this.flattenCategoryIds(category.children)];
      qb.andWhere("category.id IN (:...categoryIds)", { categoryIds });
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

    const saved = await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const variant = await manager.findOne(ProductVariantEntity, {
        where: { id: variantId },
        relations: ["product"],
        lock: { mode: "pessimistic_write" },
      });
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
      return manager.save(variant);
    });

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
    return { lowestStock: await this.variants.find({ order: { stockQuantity: "ASC" }, take: 10 }) };
  }

  async findVariantById(variantId: string, manager?: EntityManager): Promise<ProductVariantEntity> {
    const repo = manager ? manager.getRepository(ProductVariantEntity) : this.variants;
    const variant = await repo.findOne({
      where: { id: variantId },
      relations: ["product"],
      ...(manager ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
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
    mediaUrls: string[]; variants: { sku: string; name: string; hexColor?: string; stockQuantity: number; mrp?: number }[];
  }): Promise<{ entity: ProductEntity; wasCreated: boolean }> {
    this.validateProductInput(data);

    const result = await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const productRepo = manager.getRepository(ProductEntity);
      const variantRepo = manager.getRepository(ProductVariantEntity);
      const existing = await productRepo.findOne({ where: { slug: data.slug }, relations: ["variants"] });
      const existingSkus = new Set((existing?.variants ?? []).map((v) => v.sku));

      for (const variantSeed of data.variants) {
        if (!existingSkus.has(variantSeed.sku)) {
          const conflict = await variantRepo.findOne({ where: { sku: variantSeed.sku } });
          if (conflict) {
            throw new DomainException(
              DomainErrorCode.INVALID_PRODUCT_DATA,
              `SKU ${variantSeed.sku} is already assigned to another product.`,
            );
          }
        }
      }

      const entity = existing ?? productRepo.create({ slug: data.slug, status: "draft", visibility: "hidden" });
      entity.name = data.name;
      entity.category = data.category;
      entity.price = String(data.price);
      entity.salePrice = data.salePrice !== undefined ? String(data.salePrice) : undefined;
      entity.description = data.description;
      entity.content = data.content;
      entity.metaTitle = data.metaTitle;
      entity.metaDescription = data.metaDescription;
      entity.mediaUrls = data.mediaUrls;
      if (data.hsnCode !== undefined) entity.hsnCode = data.hsnCode.trim() || undefined;
      if (data.gstRate !== undefined) entity.gstRate = data.gstRate.toFixed(2);
      if (data.taxInclusiveMrp !== undefined) entity.taxInclusiveMrp = data.taxInclusiveMrp;
      const saved = await productRepo.save(entity);

      const existingBySku = new Map((existing?.variants ?? []).map((variant) => [variant.sku, variant]));
      for (const variantSeed of data.variants) {
        const variant = existingBySku.get(variantSeed.sku) ?? variantRepo.create({ product: saved, sku: variantSeed.sku });
        variant.product = saved;
        variant.name = variantSeed.name;
        variant.hexColor = variantSeed.hexColor;
        variant.stockQuantity = variantSeed.stockQuantity;
        variant.stockState = this.computeStockState(variantSeed.stockQuantity);
        if (variantSeed.mrp !== undefined) variant.mrp = String(variantSeed.mrp);
        await variantRepo.save(variant);
      }

      return { entity: saved, wasCreated: !existing };
    });

    await this.cacheInvalidation.invalidatePrefix("products");
    return result;
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
    if (product.variants.length === 0) throw new DomainException(DomainErrorCode.CANNOT_ACTIVATE_WITHOUT_VARIANT, "A product must have at least one variant before it can be activated.");
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

  async addVariant(productId: string, data: { sku: string; name: string; hexColor?: string; stockQuantity: number; mrp?: number }): Promise<ProductVariantEntity> {
    this.validateVariantInput(data);
    if (data.mrp !== undefined && (!Number.isFinite(data.mrp) || data.mrp < 0)) {
      throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Variant MRP must be a non-negative number.");
    }
    const product = await this.findProductOrThrow(productId);
    if (await this.skuExists(data.sku)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, `SKU ${data.sku} is already assigned to another product.`);
    const variant = this.variants.create({ product, sku: data.sku, name: data.name, hexColor: data.hexColor, stockQuantity: data.stockQuantity, stockState: this.computeStockState(data.stockQuantity), mrp: data.mrp == null ? undefined : String(data.mrp) });
    const saved = await this.variants.save(variant);
    await this.cacheInvalidation.invalidatePrefix("products");
    return saved;
  }

  private validateProductInput(data: {
    slug: string; name: string; price: number; salePrice?: number;
    mediaUrls: string[]; hsnCode?: string; gstRate?: number; taxInclusiveMrp?: boolean;
    variants: { sku: string; name: string; stockQuantity: number; mrp?: number }[];
  }): void {
    if (!data.slug?.trim() || !data.name?.trim()) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Product name and slug are required.");
    if (!Number.isFinite(data.price) || data.price <= 0) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Product price must be greater than zero.");
    if (data.salePrice !== undefined && (!Number.isFinite(data.salePrice) || data.salePrice < 0 || data.salePrice > data.price)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Sale price must be between zero and the regular price.");
    if (!Array.isArray(data.mediaUrls) || data.mediaUrls.some((url) => typeof url !== "string" || !url.trim())) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Product media URLs must be non-empty strings.");
    if (data.gstRate !== undefined && (!Number.isFinite(data.gstRate) || data.gstRate < 0 || data.gstRate > 100)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "GST rate must be between 0 and 100 percent.");
    if (!Array.isArray(data.variants) || data.variants.length === 0) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "At least one product variant is required.");
    const seenSkus = new Set<string>();
    for (const variant of data.variants) {
      this.validateVariantInput(variant);
      if (variant.mrp !== undefined && (!Number.isFinite(variant.mrp) || variant.mrp < 0)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Variant MRP must be a non-negative number.");
      if (variant.mrp !== undefined && variant.mrp < data.price) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, `Variant MRP for ${variant.sku} cannot be lower than the product price.`);
      if (seenSkus.has(variant.sku)) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, `Duplicate SKU ${variant.sku} in product variants.`);
      seenSkus.add(variant.sku);
    }
  }

  private validateVariantInput(data: { sku: string; name: string; stockQuantity: number }): void {
    if (!data.sku?.trim() || !data.name?.trim()) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Variant SKU and name are required.");
    if (!Number.isInteger(data.stockQuantity) || data.stockQuantity < 0) throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, "Stock quantity must be a non-negative integer.");
  }

  private flattenCategoryIds(children: CategoryEntity[] = []): string[] {
    return children.flatMap((child) => [child.id, ...this.flattenCategoryIds(child.children)]);
  }

  private computeStockState(quantity: number): StockState {
    if (quantity <= 0) return "out-of-stock";
    if (quantity <= LOW_STOCK_THRESHOLD) return "low-stock";
    return "in-stock";
  }

  async adjustStock(variantId: string, delta: number, manager?: EntityManager): Promise<ProductVariantEntity> {
    const repo = manager ? manager.getRepository(ProductVariantEntity) : this.variants;
    const variant = await repo.findOneOrFail({ where: { id: variantId }, ...(manager ? { lock: { mode: "pessimistic_write" as const } } : {}) });
    const nextQuantity = variant.stockQuantity + delta;
    if (nextQuantity < 0) throw new DomainException(DomainErrorCode.INSUFFICIENT_STOCK, `Only ${variant.stockQuantity} unit(s) of ${variant.sku} remain in stock.`);
    variant.stockQuantity = nextQuantity;
    variant.stockState = this.computeStockState(nextQuantity);
    try {
      const saved = await repo.save(variant);
      if (!manager) await this.cacheInvalidation.invalidatePrefix("products");
      return saved;
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) throw new DomainException(DomainErrorCode.STALE_WRITE_CONFLICT, "Stock for this shade changed while processing your request — please try again.", HttpStatus.CONFLICT);
      throw error;
    }
  }
}
