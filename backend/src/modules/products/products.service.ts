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

  async findVariantById(variantId: string, manager?: EntityManager): Promise<ProductVariantEntity> {
    const repo = manager ? manager.getRepository(ProductVariantEntity) : this.variants;
    const variant = manager
      ? await repo.createQueryBuilder("variant")
          .leftJoinAndSelect("variant.product", "product")
          .where("variant.id = :variantId", { variantId })
          .setLock("pessimistic_write")
          .getOne()
      : await repo.findOne({ where: { id: variantId }, relations: ["product"] });
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
      const existing = await manager.findOne(ProductEntity, {
        where: { slug: data.slug },
        relations: ["variants"],
      });
      const existingSkus = new Set((existing?.variants ?? []).map((v) => v.sku));

      // Check all new SKUs inside the same transaction before any product or
      // variant write. The DB unique index remains the final integrity guard.
      for (const variantSeed of data.variants) {
        if (!existingSkus.has(variantSeed.sku)) {
          const conflict = await manager.findOne(ProductVariantEntity, { where: { sku: variantSeed.sku } });
          if (conflict) {
            throw new DomainException(DomainErrorCode.INVALID_PRODUCT_DATA, \`SKU \${variantSeed.sku} is already assigned to another product.\`);
          }
        }
      }

      const entity = existing ?? manager.create(ProductEntity, { slug: data.slug, status: "draft", visibility: "hidden" });
      entity.name = data.name;
      entity.category = data.category;
      entity.price = String(data.price);
      entity.salePrice = data.salePrice !== undefined ? String(data.salePrice) : undefined;
      entity.description = data.description;
      entity.content = data.content;
      entity.metaTitle = data.metaTitle;
      entity.metaDescription = data.metaDescription;
      entity.mediaUrls = data.mediaUrls;
      const saved = await manager.save(entity);

      const currentVariants = new Map((existing?.variants ?? []).map((variant) => [variant.sku, variant]));
      for (const variantSeed of data.variants) {
        const current = currentVariants.get(variantSeed.sku);
        if (current) {
          current.name = variantSeed.name;
          current.hexColor = variantSeed.hexColor;
          current.stockQuantity = variantSeed.stockQuantity;
          if (variantSeed.mrp !== undefined) current.mrp = String(variantSeed.mrp);
          current.stockState = this.computeStockState(variantSeed.stockQuantity);
          await manager.save(current);
        } else {
          const variant = manager.create(ProductVariantEntity, {
            product: saved,
            sku: variantSeed.sku,
            name: variantSeed.name,
            hexColor: variantSeed.hexColor,
            mrp: variantSeed.mrp !== undefined ? String(variantSeed.mrp) : undefined,
            stockQuantity: variantSeed.stockQuantity,
            stockState: this.computeStockState(variantSeed.stockQuantity),
          });
          await manager.save(variant);
        }
      }
      return { entity: saved, wasCreated: !existing };
    });

    await this.cacheInvalidation.invalidatePrefix("products");
    return result;
  }

