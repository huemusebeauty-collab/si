import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { ProductTaxService } from "./product-tax.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { CreateProductDto, SetInventoryStockDto, UpdateProductTaxDto } from "./dto/create-product.dto";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { CategoriesService } from "@/modules/categories/categories.service";
import type { Request } from "express";

const MEDIA_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.[a-z0-9]{1,12})?$/i;
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const MEDIA_CATEGORIES = new Set(["product-media", "cms-assets", "review-media"]);
const MEDIA_RESPONSE_VERSION = "2";

@ApiTags("products")
@Controller({ path: "products", version: "1" })
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly productTax: ProductTaxService,
    private readonly categories: CategoriesService,
  ) {}

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products-v3" })
  @Get()
  list(@Query() query: ListProductsQueryDto, @Req() request: Request) {
    return this.normalizePaginatedMedia(this.products.listProducts(query), request);
  }

  @Public()
  @Get("availability/:sku")
  checkAvailability(@Param("sku") sku: string) { return this.products.checkAvailability(sku); }

  @RequirePermission("products", "view")
  @Get("admin")
  listAdmin(@Query() query: ListProductsQueryDto, @Req() request: Request) {
    return this.normalizePaginatedMedia(this.products.listAdminProducts(query), request);
  }

  @RequirePermission("products", "edit")
  @Post("admin")
  async createProduct(@Body() body: CreateProductDto) {
    const category = await this.categories.getCategory(body.categorySlug);
    return this.products.upsertFullProduct({ ...body, category, content: { ...body.content, specifications: body.content.specifications ?? {} } });
  }

  @RequirePermission("products", "view")
  @Get("admin/inventory")
  listInventory() { return this.products.listInventory(); }

  @RequirePermission("products", "edit")
  @Patch("admin/inventory/:variantId")
  setStock(@Param("variantId") variantId: string, @Body() body: SetInventoryStockDto) {
    return this.products.setStock(variantId, body.quantity, body.expectedVersion);
  }

  @RequirePermission("products", "view")
  @Get("admin/:productId")
  async getAdminProduct(@Param("productId") productId: string, @Req() request: Request) {
    return this.normalizeProduct(await this.products.getAdminProduct(productId), request);
  }

  @RequirePermission("products", "edit")
  @Patch("admin/:productId")
  async updateProduct(@Param("productId") productId: string, @Body() body: CreateProductDto) {
    const category = await this.categories.getCategory(body.categorySlug);
    return this.products.updateProductById(productId, { ...body, category, content: { ...body.content, specifications: body.content.specifications ?? {} } });
  }

  @RequirePermission("products", "view")
  @Get("admin/:productId/tax")
  getTaxConfig(@Param("productId") productId: string) {
    return this.productTax.getTaxConfig(productId);
  }

  @RequirePermission("products", "edit")
  @Patch("admin/:productId/tax")
  updateTaxConfig(@Param("productId") productId: string, @Body() body: UpdateProductTaxDto) {
    return this.productTax.updateTaxConfig(productId, body);
  }

  @RequirePermission("products", "full")
  @Post("admin/bulk-activate")
  bulkActivate(@Body("productIds") productIds: string[]) { return this.products.bulkActivate(productIds); }

  @RequirePermission("products", "full")
  @Post("admin/bulk-deactivate")
  bulkDeactivate(@Body("productIds") productIds: string[]) { return this.products.bulkDeactivate(productIds); }

  @Roles("admin")
  @Post(":productId/activate")
  activate(@Param("productId") productId: string) { return this.products.activate(productId); }

  @Roles("admin")
  @Post(":productId/deactivate")
  deactivate(@Param("productId") productId: string) { return this.products.deactivate(productId); }

  @Roles("admin")
  @Post(":productId/variants")
  addVariant(@Param("productId") productId: string, @Body() dto: CreateVariantDto) { return this.products.addVariant(productId, dto); }

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products-v3" })
  @Get(":slug")
  async getBySlug(@Param("slug") slug: string, @Req() request: Request) {
    return this.normalizeProduct(await this.products.getProduct(slug), request);
  }

  @Public()
  @Get(":productId/variants/:variantId")
  getVariant(@Param("productId") productId: string, @Param("variantId") variantId: string) {
    return this.products.getVariant(productId, variantId);
  }

  private async normalizePaginatedMedia<T extends { mediaUrls?: string[] }>(
    resultPromise: Promise<{ items: T[]; meta: unknown }>,
    request: Request,
  ) {
    const result = await resultPromise;
    return { ...result, items: result.items.map((item) => this.normalizeProduct(item, request)) };
  }

  private normalizeProduct<T extends { mediaUrls?: string[] }>(product: T, request: Request): T {
    if (!Array.isArray(product.mediaUrls) || product.mediaUrls.length === 0) return product;
    return { ...product, mediaUrls: product.mediaUrls.map((url) => this.normalizeMediaUrl(url, request)) };
  }

  private normalizeMediaUrl(url: string, request: Request): string {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const categoryIndex = parts.findIndex((part) => MEDIA_CATEGORIES.has(part));
      if (categoryIndex < 0 || categoryIndex !== parts.length - 2) return url;

      const category = parts[categoryIndex];
      const id = parts[categoryIndex + 1];
      if (!MEDIA_ID_RE.test(id)) return url;

      const extension = id.includes(".") ? id.split(".").pop()!.toLowerCase() : "";
      const type = parsed.searchParams.get("type") === "video" || VIDEO_EXTENSIONS.has(extension) ? "video" : "image";

      if (parsed.pathname.includes("/v1/storage/media/")) {
        parsed.searchParams.set("type", type);
        parsed.searchParams.set("v", MEDIA_RESPONSE_VERSION);
        return parsed.toString();
      }

      const protocol = String(request.headers["x-forwarded-proto"] ?? request.protocol).split(",")[0].trim();
      const host = request.get("host");
      if (!protocol || !host) return url;
      return `${protocol}://${host}/v1/storage/media/${encodeURIComponent(category)}/${encodeURIComponent(id)}?type=${type}&v=${MEDIA_RESPONSE_VERSION}`;
    } catch {
      return url;
    }
  }

}
