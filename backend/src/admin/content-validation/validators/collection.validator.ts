import type { ValidationIssue } from "../validation-result";
import { validateSeoMetadata, type SeoMetadataInput } from "./seo.validator";

// Sprint 7.3.4 — Collection Validation, per Phase 9 §5.
export interface CollectionValidationInput {
  name: string;
  slug: string;
  slugAlreadyExists: boolean;
  featured: boolean;
  productIds: string[];
  displayOrder: number;
  startAt?: Date;
  endAt?: Date;
  seo: SeoMetadataInput;
}

export function validateCollection(input: CollectionValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.name?.trim()) {
    issues.push({ severity: "error", code: "COLLECTION_MISSING_NAME", message: "Collection name is required.", field: "name" });
  }
  if (!input.slug?.trim()) {
    issues.push({ severity: "error", code: "COLLECTION_MISSING_SLUG", message: "Collection slug is required.", field: "slug" });
  } else if (input.slugAlreadyExists) {
    issues.push({ severity: "error", code: "COLLECTION_DUPLICATE_SLUG", message: `Slug "${input.slug}" is already in use.`, field: "slug" });
  }

  if (input.productIds.length === 0) {
    issues.push({ severity: "warning", code: "COLLECTION_NO_PRODUCTS", message: "Collection has no assigned products — will render empty on the storefront.", field: "productIds" });
  }

  if (input.featured && input.productIds.length < 3) {
    issues.push({ severity: "suggestion", code: "COLLECTION_FEATURED_LOW_COUNT", message: "A featured collection with fewer than 3 products may look sparse on the homepage.", field: "featured" });
  }

  if (input.startAt && input.endAt && input.startAt >= input.endAt) {
    issues.push({ severity: "error", code: "COLLECTION_INVALID_DATE_RANGE", message: "Active start date must be before the end date.", field: "startAt" });
  }

  if (input.displayOrder < 0) {
    issues.push({ severity: "warning", code: "COLLECTION_NEGATIVE_DISPLAY_ORDER", message: "Display order is negative.", field: "displayOrder" });
  }

  issues.push(...validateSeoMetadata(input.seo, "collection"));

  return issues;
}
