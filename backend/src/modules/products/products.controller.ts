import { Controller, Get, Param, Patch, Post, Body, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

@ApiTags("products")
@Controller({ path: "products", version: "1" })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products" })
  @Get()
  list(@Query() query: ListProductsQueryDto) { return this.products.listProducts(query); }

  @Public()
  @Cacheable({ ttlSeconds: 60, keyPrefix: "products" })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string) { return this.products.getProduct(slug); }

  @Public()
  @Get(":productId/variants/:variantId")
  getVariant(@Param("productId") productId: string, @Param("variantId") variantId: string) {
    return this.products.getVariant(productId, variantId);
  }

  @Public()
  @Get("availability/:sku")
  checkAvailability(@Param("sku") sku: string) { return this.products.checkAvailability(sku); }

  // Admin inventory endpoints. These are intentionally before the dynamic
  // :slug route so /admin/inventory is resolved as a fixed resource.
  @RequirePermission("products", "view")
  @Get("admin/inventory")
  listInventory() { return this.products.listInventory(); }

  @RequirePermission("products", "edit")
  @Patch("admin/inventory/:variantId")
  setStock(
    @Param("variantId") variantId: string,
    @Body() body: { quantity: number; expectedVersion?: number },
  ) {
    return this.products.setStock(variantId, body.quantity, body.expectedVersion);
  }

  @Roles("admin")
  @Post(":productId/activate")
  activate(@Param("productId") productId: string) { return this.products.activate(productId); }

  @Roles("admin")
  @Post(":productId/deactivate")
  deactivate(@Param("productId") productId: string) { return this.products.deactivate(productId); }

  @Roles("admin")
  @Post(":productId/variants")
  addVariant(@Param("productId") productId: string, @Body() dto: CreateVariantDto) {
    return this.products.addVariant(productId, dto);
  }

  @RequirePermission("products", "full")
  @Post("admin/bulk-activate")
  bulkActivate(@Body("productIds") productIds: string[]) { return this.products.bulkActivate(productIds); }

  @RequirePermission("products", "full")
  @Post("admin/bulk-deactivate")
  bulkDeactivate(@Body("productIds") productIds: string[]) { return this.products.bulkDeactivate(productIds); }
}