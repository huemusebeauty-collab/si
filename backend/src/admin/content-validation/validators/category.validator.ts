import type { ValidationIssue } from "../validation-result";
import { validateSeoMetadata, type SeoMetadataInput } from "./seo.validator";

// Sprint 7.3.3 — Category Validation, per Phase 1 §4 / Phase 6 §3.
export interface CategoryValidationInput {
  name: string;
  slug: string;
  slugAlreadyExists: boolean;
  parentSlug?: string;
  parentExists: boolean; // computed by ContentValidationService (module boundary)
  visible: boolean;
  displayOrder: number;
  seo: SeoMetadataInput;
}

export function validateCategory(input: CategoryValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.name?.trim()) {
    issues.push({ severity: "error", code: "CATEGORY_MISSING_NAME", message: "Category name is required.", field: "name" });
  }

  if (!input.slug?.trim()) {
    issues.push({ severity: "error", code: "CATEGORY_MISSING_SLUG", message: "Category slug is required.", field: "slug" });
  } else if (input.slugAlreadyExists) {
    issues.push({ severity: "error", code: "CATEGORY_DUPLICATE_SLUG", message: `Slug "${input.slug}" is already in use.`, field: "slug" });
  }

  if (input.parentSlug && !input.parentExists) {
    issues.push({ severity: "error", code: "CATEGORY_INVALID_PARENT", message: `Parent category "${input.parentSlug}" does not exist.`, field: "parentSlug" });
  }
  if (input.parentSlug === input.slug) {
    issues.push({ severity: "error", code: "CATEGORY_SELF_PARENT", message: "A category cannot be its own parent.", field: "parentSlug" });
  }

  if (input.visible && input.displayOrder < 0) {
    issues.push({ severity: "warning", code: "CATEGORY_NEGATIVE_DISPLAY_ORDER", message: "Display order is negative — will sort before every non-negative category.", field: "displayOrder" });
  }

  issues.push(...validateSeoMetadata(input.seo, "category"));

  return issues;
}
