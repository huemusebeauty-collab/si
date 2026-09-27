import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CollectionsService } from "./collections.service";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

@ApiTags("collections")
@Controller({ path: "collections", version: "1" })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "collections" }) // Sprint 4.11 — extended Redis caching
  @Get()
  list(@Query("type") type?: string) {
    return this.collections.listActiveCollections(type);
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "collections" })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.collections.getCollection(slug);
  }

  @Roles("admin")
  @Get("admin")
  listAdmin() { return this.collections.listAdminCollections(); }

  @RequirePermission("categories", "edit")
  @Post("admin")
  createAdmin(@Body() body: { slug: string; name: string; tagline?: string; active?: boolean; featured?: boolean; displayOrder?: number; metaTitle?: string; metaDescription?: string; startAt?: Date; endAt?: Date }) {
    return this.collections.createCollection(body);
  }

  @RequirePermission("categories", "edit")
  @Patch("admin/:collectionId")
  updateAdmin(@Param("collectionId") collectionId: string, @Body() body: { slug?: string; name?: string; tagline?: string; active?: boolean; featured?: boolean; displayOrder?: number; metaTitle?: string; metaDescription?: string; startAt?: Date | null; endAt?: Date | null }) {
    return this.collections.updateCollection(collectionId, body);
  }

  @RequirePermission("categories", "edit")
  @Delete("admin/:collectionId")
  deleteAdmin(@Param("collectionId") collectionId: string) {
    return this.collections.deleteCollection(collectionId);
  }

  @RequirePermission("categories", "edit")
  @Patch(":collectionId/active")
  setActive(@Param("collectionId") collectionId: string, @Body("active") active: boolean) {
    return this.collections.setActive(collectionId, active);
  }

  @RequirePermission("categories", "edit")
  @Post(":collectionId/products/:productId")
  assignProduct(@Param("collectionId") collectionId: string, @Param("productId") productId: string) {
    return this.collections.assignProduct(collectionId, productId);
  }

  @Roles("admin")
  @Delete(":collectionId/products/:productId")
  unassignProduct(@Param("collectionId") collectionId: string, @Param("productId") productId: string) {
    return this.collections.unassignProduct(collectionId, productId);
  }

  @Roles("admin")
  @Patch(":collectionId/featured")
  setFeatured(@Param("collectionId") collectionId: string, @Body("featured") featured: boolean) {
    return this.collections.setFeatured(collectionId, featured);
  }

  @Roles("admin")
  @Patch(":collectionId/display-order")
  setDisplayOrder(@Param("collectionId") collectionId: string, @Body("displayOrder") displayOrder: number) {
    return this.collections.setDisplayOrder(collectionId, displayOrder);
  }
}
