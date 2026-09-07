import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";

@ApiTags("categories")
@Controller({ path: "categories", version: "1" })
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "categories" })
  @Get()
  list() {
    return this.categories.listCategories();
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "categories" })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.categories.getCategory(slug);
  }

  @Roles("admin")
  @Patch(":categoryId/visibility")
  setVisibility(@Param("categoryId") categoryId: string, @Body("visible") visible: boolean) {
    return this.categories.setVisibility(categoryId, visible);
  }

  @Roles("admin")
  @Patch(":categoryId/display-order")
  setDisplayOrder(@Param("categoryId") categoryId: string, @Body("displayOrder") displayOrder: number) {
    return this.categories.setDisplayOrder(categoryId, displayOrder);
  }
}
