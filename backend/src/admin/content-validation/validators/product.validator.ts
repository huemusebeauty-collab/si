import type { ValidationIssue } from "../validation-result";
import { validateSeoMetadata, type SeoMetadataInput } from "./seo.validator";

// Sprint 7.3.2 — Product Validation, per Phase 9 §3 (content
// standards) and Phase 2 §10/§14 (pricing, SEO). Pure function — no DB
// access here; uniqueness checks are passed in as pre-computed booleans
// (see ContentValidationService, which fetches those via
// ProductsService per the module-boundary rule) so this validator stays
// a plain, fully unit-testable function with no mocking required.
export interface ProductValidationInput {
  name: string;
  slug: string;
  slugAlreadyExists: boolean;
  description?: string;
  content?: {
    shortDescription?: string;
    keyBenefits?: string[];
    ingredients?: string;
  };
  price: number;
  salePrice?: number;
  variants: { sku: string; name: string; skuAlreadyExists: boolean; stockQuantity: number }[];
  mediaUrls: string[];
  seo: SeoMetadataInput;
}

const SHORT_DESCRIPTION_MAX_WORDS = 20; // Phase 9 §3: "under 20 words"
const MAX_REASONABLE_STOCK = 100_000; // Sprint 7.3.2 "Inventory limits" — a sanity ceiling, not a business rule

export function validateProduct(input: ProductValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.name || input.name.trim().length === 0) {
    issues.push({ severity: "error", code: "PRODUCT_MISSING_NAME", message: "Product name is required.", field: "name" });
  }

  if (!input.slug || input.slug.trim().length === 0) {
    issues.push({ severity: "error", code: "PRODUCT_MISSING_SLUG", message: "Product slug is required.", field: "slug" });
  } else if (input.slugAlreadyExists) {
    issues.push({ severity: "error", code: "PRODUCT_DUPLICATE_SLUG", message: `Slug "${input.slug}" is already in use by another product.`, field: "slug" });
  }

  if (!input.description || input.description.trim().length < 20) {
    issues.push({
      severity: "warning",
      code: "PRODUCT_DESCRIPTION_TOO_SHORT",
      message: "Full description is missing or very short — Phase 9 §3 expects 2-3 sentences covering benefit, finish/texture, and occasion.",
      field: "description",
    });
  }

  const shortDescription = input.content?.shortDescription;
  if (!shortDescription) {
    issues.push({ severity: "error", code: "PRODUCT_MISSING_SHORT_DESCRIPTION", message: "Short description is required (used in listings and search snippets).", field: "content.shortDescription" });
  } else {
    const wordCount = shortDescription.trim().split(/\s+/).length;
    if (wordCount > SHORT_DESCRIPTION_MAX_WORDS) {
      issues.push({
        severity: "warning",
        code: "PRODUCT_SHORT_DESCRIPTION_TOO_LONG",
        message: `Short description is ${wordCount} words — Phase 9 §3 specifies under ${SHORT_DESCRIPTION_MAX_WORDS}.`,
        field: "content.shortDescription",
      });
    }
  }

  const keyBenefits = input.content?.keyBenefits ?? [];
  if (keyBenefits.length < 3 || keyBenefits.length > 5) {
    issues.push({
      severity: "warning",
      code: "PRODUCT_KEY_BENEFITS_COUNT",
      message: `${keyBenefits.length} key benefit(s) listed — Phase 9 §3 specifies 3-5.`,
      field: "content.keyBenefits",
    });
  }

  if (!input.content?.ingredients) {
    issues.push({ severity: "error", code: "PRODUCT_MISSING_INGREDIENTS", message: "Full ingredient listing is required — never omitted, per Phase 9 §3 (allergen safety).", field: "content.ingredients" });
  }

  // Price rules (Sprint 7.3.2 / Phase 2 §10)
  if (input.price <= 0) {
    issues.push({ severity: "error", code: "PRODUCT_INVALID_PRICE", message: "Price must be greater than zero.", field: "price" });
  }
  if (input.salePrice !== undefined) {
    if (input.salePrice <= 0) {
      issues.push({ severity: "error", code: "PRODUCT_INVALID_SALE_PRICE", message: "Sale price must be greater than zero.", field: "salePrice" });
    } else if (input.salePrice > input.price) {
      issues.push({ severity: "error", code: "PRODUCT_SALE_PRICE_EXCEEDS_PRICE", message: "Sale price must not exceed the regular price.", field: "salePrice" });
    }
  }

  // Variant consistency (Sprint 7.3.2)
  if (input.variants.length === 0) {
    issues.push({ severity: "error", code: "PRODUCT_NO_VARIANTS", message: "Product has no variants/shades — nothing purchasable.", field: "variants" });
  }
  const seenSkusInThisProduct = new Set<string>();
  for (const variant of input.variants) {
    if (!variant.sku) {
      issues.push({ severity: "error", code: "PRODUCT_VARIANT_MISSING_SKU", message: `Variant "${variant.name}" has no SKU.`, field: "variants" });
    } else if (variant.skuAlreadyExists) {
      issues.push({ severity: "error", code: "PRODUCT_DUPLICATE_SKU", message: `SKU "${variant.sku}" is already in use by another variant.`, field: "variants" });
    } else if (seenSkusInThisProduct.has(variant.sku)) {
      issues.push({ severity: "error", code: "PRODUCT_DUPLICATE_SKU_WITHIN_PRODUCT", message: `SKU "${variant.sku}" is used by more than one variant on this same product.`, field: "variants" });
    }
    seenSkusInThisProduct.add(variant.sku);

    if (variant.stockQuantity < 0) {
      issues.push({ severity: "error", code: "PRODUCT_NEGATIVE_STOCK", message: `Variant "${variant.name}" has negative stock quantity.`, field: "variants" });
    } else if (variant.stockQuantity > MAX_REASONABLE_STOCK) {
      issues.push({ severity: "warning", code: "PRODUCT_IMPLAUSIBLE_STOCK", message: `Variant "${variant.name}" stock quantity (${variant.stockQuantity}) looks implausibly high — confirm this wasn't a data-entry error.`, field: "variants" });
    }
  }

  // Required media (Sprint 7.3.2 / Phase 9 §7)
  if (input.mediaUrls.length === 0) {
    issues.push({ severity: "error", code: "PRODUCT_MISSING_MEDIA", message: "Product has no images.", field: "mediaUrls" });
  }

  issues.push(...validateSeoMetadata(input.seo, "product"));

  return issues;
}
