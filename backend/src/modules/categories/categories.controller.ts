import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Cacheable } from "@/cache/cacheable.decorator";
import { RequirePermission } from "@/admin/common/require-permission.decorator";

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

  @Roles("admin")
  @Get("admin")
  listAdmin() {
    return this.categories.listAdminCategories();
  }

  @Public()
  @Cacheable({ ttlSeconds: 300, keyPrefix: "categories" })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string) {
    return this.categories.getCategory(slug);
  }

  @RequirePermission("categories", "edit")
  @Post("admin")
  createAdmin(@Body() body: {
    slug: string;
    name: string;
    parentId?: string | null;
    displayOrder?: number;
    visible?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }) {
    if (!body.slug?.trim() || !body.name?.trim()) throw new BadRequestException("Category name and slug are required.");
    return this.categories.createCategory(body);
  }

  @RequirePermission("categories", "edit")
  @Patch("admin/:categoryId")
  updateAdmin(@Param("categoryId") categoryId: string, @Body() body: {
    slug?: string;
    name?: string;
    parentId?: string | null;
    displayOrder?: number;
    visible?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }) {
    return this.categories.updateCategory(categoryId, body);
  }

  @RequirePermission("categories", "edit")
  @Patch(":categoryId/visibility")
  setVisibility(@Param("categoryId") categoryId: string, @Body("visible") visible: boolean) {
    return this.categories.setVisibility(categoryId, visible);
  }

  @RequirePermission("categories", "edit")
  @Patch(":categoryId/display-order")
  setDisplayOrder(@Param("categoryId") categoryId: string, @Body("displayOrder") displayOrder: number) {
    return this.categories.setDisplayOrder(categoryId, displayOrder);
  }
}
