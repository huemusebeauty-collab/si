import { Injectable } from "@nestjs/common";
import { buildReport, type ValidationReport } from "./validation-result";
import { validateProduct, type ProductValidationInput } from "./validators/product.validator";
import { validateCategory, type CategoryValidationInput } from "./validators/category.validator";
import { validateCollection, type CollectionValidationInput } from "./validators/collection.validator";
import { validateCmsPage, type CmsPageValidationInput } from "./validators/cms.validator";
import { validateBanner, type BannerValidationInput } from "./validators/banner.validator";
import { validateFaq, type FaqValidationInput } from "./validators/faq.validator";
import { validateMedia, type MediaValidationInput } from "./validators/media.validator";
import { validateNotificationTemplate, type NotificationTemplateValidationInput } from "./validators/notification-template.validator";
import { validateSeoMetadata, type SeoMetadataInput } from "./validators/seo.validator";
import { validateAccessibility, type AccessibilityContentInput } from "./validators/accessibility.validator";
import { ProductsService } from "@/modules/products/products.service";
import { CategoriesService } from "@/modules/categories/categories.service";
import { CollectionsService } from "@/modules/collections/collections.service";
import { CmsService } from "@/modules/cms/cms.service";
import { SettingsService } from "@/admin/settings/settings.service";

// Sprint 7.3.1 — the single reusable Content Validation Engine every
// module routes through (Sprint 7.3's own "do not duplicate validation
// logic across modules" instruction). Each `validate*` method here:
// (1) gathers whatever cross-entity data the pure validator function
// needs (uniqueness checks, broken-link resolution) by calling the
// OWNING module's service — never a repository directly, per Phase 8
// §3 — then (2) delegates the actual rule-checking to the pure,
// independently-unit-tested validator function, then (3) wraps the
// result in the standardized ValidationReport shape (7.3.9).
@Injectable()
export class ContentValidationService {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly collections: CollectionsService,
    private readonly cms: CmsService,
    private readonly settings: SettingsService,
  ) {}

  async validateProductContent(
    input: Omit<ProductValidationInput, "slugAlreadyExists" | "variants"> & {
      productId?: string; // undefined for a new/not-yet-created product
      variants: { sku: string; name: string; stockQuantity: number; variantId?: string }[];
    },
  ): Promise<ValidationReport> {
    const slugAlreadyExists = await this.products.slugExists(input.slug, input.productId);
    const variants = await Promise.all(
      input.variants.map(async (v) => ({
        ...v,
        skuAlreadyExists: await this.products.skuExists(v.sku, v.variantId),
      })),
    );
    const issues = validateProduct({ ...input, slugAlreadyExists, variants });
    return buildReport("product", issues, input.productId);
  }

  async validateCategoryContent(
    input: Omit<CategoryValidationInput, "slugAlreadyExists" | "parentExists"> & { categoryId?: string },
  ): Promise<ValidationReport> {
    const slugAlreadyExists = await this.categories.slugExists(input.slug, input.categoryId);
    const parentExists = input.parentSlug ? await this.categories.getCategory(input.parentSlug).then(() => true).catch(() => false) : true;
    const issues = validateCategory({ ...input, slugAlreadyExists, parentExists });
    return buildReport("category", issues, input.categoryId);
  }

  async validateCollectionContent(
    input: Omit<CollectionValidationInput, "slugAlreadyExists"> & { collectionId?: string },
  ): Promise<ValidationReport> {
    const slugAlreadyExists = await this.collections.slugExists(input.slug, input.collectionId);
    const issues = validateCollection({ ...input, slugAlreadyExists });
    return buildReport("collection", issues, input.collectionId);
  }

  async validateCmsPageContent(
    input: Omit<CmsPageValidationInput, "slugAlreadyExists"> & { isNewPage: boolean },
  ): Promise<ValidationReport> {
    // Sprint 7.3.5 — only a NEW page's slug can "already exist" as a
    // conflict; updating an existing page naturally matches its own
    // slug, which isn't a duplicate.
    const slugAlreadyExists = input.isNewPage ? await this.cms.pageSlugExists(input.slug) : false;
    const issues = validateCmsPage({ ...input, slugAlreadyExists });
    return buildReport("cmsPage", issues, input.slug);
  }

  async validateBannerContent(input: BannerValidationInput): Promise<ValidationReport> {
    const issues = validateBanner(input);
    return buildReport("banner", issues);
  }

  async validateFaqContent(input: FaqValidationInput): Promise<ValidationReport> {
    const issues = validateFaq(input);
    return buildReport("faq", issues);
  }

  async validateMediaContent(input: MediaValidationInput): Promise<ValidationReport> {
    // Sprint 7.5 — fetches the REAL configured limits (Settings module)
    // rather than the validator's own hardcoded defaults, closing the
    // "two constants that happen to agree" gap.
    const mediaSettings = await this.settings.getMediaSettings();
    const issues = validateMedia(input, { maxFileSizeBytes: mediaSettings.maxUploadSizeBytes, minDimensionPx: mediaSettings.minImageDimensionPx });
    return buildReport("media", issues, input.url);
  }

  async validateNotificationTemplateContent(input: NotificationTemplateValidationInput): Promise<ValidationReport> {
    const issues = validateNotificationTemplate(input);
    return buildReport("notificationTemplate", issues, input.templateKey);
  }

  async validateSeoContent(input: SeoMetadataInput, contentType: string, entityId?: string): Promise<ValidationReport> {
    const issues = validateSeoMetadata(input, contentType);
    return buildReport(`${contentType}Seo`, issues, entityId);
  }

  async validateAccessibilityContent(input: AccessibilityContentInput, contentType: string, entityId?: string): Promise<ValidationReport> {
    const issues = validateAccessibility(input);
    return buildReport(`${contentType}Accessibility`, issues, entityId);
  }
}
