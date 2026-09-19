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

