import { Controller, Get, Param, Patch, Post, Body, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

// Sprint 3.6 — resource-oriented, versioned, public (guest browsing per
// Phase 8 §5's "customer-facing endpoints support guest ... access").
@ApiTags("products")
@Controller({ path: "products", version: "1" })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products" }) // Phase 8 §8 — frequently-read, rarely-changed listing data
  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.products.listProducts(query);
  }

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products" })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.products.getProduct(slug);
  }

  @Public()
  @Get(":productId/variants/:variantId")
  getVariant(@Param("productId") productId: string, @Param("variantId") variantId: string) {
    return this.products.getVariant(productId, variantId);
  }

  @Public()
  @Get("availability/:sku")
  checkAvailability(@Param("sku") sku: string) {
    return this.products.checkAvailability(sku);
  }

  // Sprint 4.2 — Product Domain: activation/deactivation and shade
  // (variant) management. Admin-gated since there's no storefront use
  // case for a customer to call these directly.
  @Roles("admin")
  @Post(":productId/activate")
  activate(@Param("productId") productId: string) {
    return this.products.activate(productId);
  }

  @Roles("admin")
  @Post(":productId/deactivate")
  deactivate(@Param("productId") productId: string) {
    return this.products.deactivate(productId);
  }

  @Roles("admin")
  @Post(":productId/variants")
  addVariant(@Param("productId") productId: string, @Body() dto: CreateVariantDto) {
    return this.products.addVariant(productId, dto);
  }

  // Sprint 6B — Bulk operations (completing the gap Sprint 6A left
  // service-layer only: ProductsService.bulkActivate/bulkDeactivate
  // existed with no HTTP endpoint).
  @RequirePermission("products", "full")
  @Post("admin/bulk-activate")
  bulkActivate(@Body("productIds") productIds: string[]) {
    return this.products.bulkActivate(productIds);
  }

  @RequirePermission("products", "full")
  @Post("admin/bulk-deactivate")
  bulkDeactivate(@Body("productIds") productIds: string[]) {
    return this.products.bulkDeactivate(productIds);
  }
}