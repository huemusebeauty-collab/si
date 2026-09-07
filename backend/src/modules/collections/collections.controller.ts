import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CollectionsService } from "./collections.service";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";

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
