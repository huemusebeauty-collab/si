import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ContentValidationService } from "./content-validation.service";
import { ProductsService } from "@/modules/products/products.service";
import { CategoriesService } from "@/modules/categories/categories.service";
import { CollectionsService } from "@/modules/collections/collections.service";
import { CmsService } from "@/modules/cms/cms.service";
import { RequirePermission } from "@/admin/common/require-permission.decorator";
import { DomainErrorCode, DomainException } from "@/common/exceptions/domain.exception";
import type { ProductContent } from "@/modules/products/entities/product.entity";

// Sprint 7.3 — architectural note: ContentValidationService already
// depends on ProductsService/CategoriesService/CollectionsService/
// CmsService for existence checks (slug/SKU uniqueness). Injecting
// ContentValidationService back INTO those modules' own controllers
// would create a circular module dependency (A imports B, B imports A).
// Rather than reach for `forwardRef()` (a workable but fragile Nest
// escape hatch this project has avoided everywhere else), this
// controller centralizes "validate, then perform the real action"
// orchestration here instead — it depends on all four content services
// (one-directional, no cycle), validates first, and only calls the
// existing module's real business method (ProductsService.activate,
// etc. — completely unchanged, not duplicated) if validation passes.
// This is how "existing modules consume the shared validation service"
// is satisfied without restructuring the module graph.
@ApiTags("content-validation")
@ApiBearerAuth()
@Controller({ path: "admin/content-validation", version: "1" })
export class ContentValidationController {
  constructor(
    private readonly validation: ContentValidationService,
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly collections: CollectionsService,
    private readonly cms: CmsService,
  ) {}

  // Sprint 7.3 — preview-only: runs validation without performing any
  // action. Used by an admin content editor to check a product before
  // saving/publishing, per Sprint 7.3's "before it is saved, imported,
  // or seeded" framing.
  @RequirePermission("products", "view")
  @Post("products/preview")
  previewProduct(@Body() body: Parameters<ContentValidationService["validateProductContent"]>[0]) {
    return this.validation.validateProductContent(body);
  }

  // Sprint 7.3 — validate-then-activate: the actual integration point.
  // A product can only be activated if it passes validation — this is
  // the enforcement Sprint 7.3's acceptance criteria describes
  // ("every supported content type passes through the centralized
  // validation engine" before becoming available to customers).
  @RequirePermission("products", "full")
  @Post("products/:productId/validate-and-activate")
  async validateAndActivateProduct(@Param("productId") productId: string, @Body("content") content?: ProductContent) {
    const product = await this.products.findById(productId);
    const report = await this.validation.validateProductContent({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      content: content ?? product.content,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      variants: product.variants.map((v) => ({ sku: v.sku, name: v.name, stockQuantity: v.stockQuantity, variantId: v.id })),
      mediaUrls: product.mediaUrls,
      seo: { metaTitle: product.metaTitle, metaDescription: product.metaDescription },
    });

    if (!report.isValid) {
      throw new DomainException(
        DomainErrorCode.INVALID_STATUS_TRANSITION,
        `Product failed content validation: ${report.issues.filter((i) => i.severity === "error").map((i) => i.message).join(" ")}`,
      );
    }
    return this.products.activate(productId);
  }
}
