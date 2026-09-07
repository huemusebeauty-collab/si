import type { ValidationIssue } from "../validation-result";
import { validateSeoMetadata, type SeoMetadataInput } from "./seo.validator";

// Sprint 7.3.5 — CMS Validation (static pages), per Phase 9 §2/§14.
export interface CmsPageValidationInput {
  slug: string;
  slugAlreadyExists: boolean; // true only for a NEW page whose slug collides — updates to an existing page pass their own slug as already "existing" by definition, see ContentValidationService
  title: string;
  content: string;
  isDraft: boolean;
  internalLinks: string[]; // hrefs referenced in content
  brokenInternalLinks: string[]; // computed by caller: subset of internalLinks that don't resolve to a real route/page
  bannerImageUrls: string[];
  brokenBannerImageUrls: string[]; // subset that 404 or aren't recognized uploads
  seo: SeoMetadataInput;
}

export function validateCmsPage(input: CmsPageValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.slug?.trim()) {
    issues.push({ severity: "error", code: "CMS_MISSING_SLUG", message: "Page slug is required.", field: "slug" });
  } else if (input.slugAlreadyExists) {
    issues.push({ severity: "error", code: "CMS_DUPLICATE_SLUG", message: `Slug "${input.slug}" is already in use by another page.`, field: "slug" });
  }

  if (!input.title?.trim()) {
    issues.push({ severity: "error", code: "CMS_MISSING_TITLE", message: "Page title is required.", field: "title" });
  }

  if (!input.content?.trim()) {
    issues.push({ severity: "error", code: "CMS_MISSING_CONTENT", message: "Page content is required.", field: "content" });
  }

  if (input.isDraft) {
    issues.push({ severity: "suggestion", code: "CMS_DRAFT_STATE", message: "Page is in draft state and won't be publicly visible until published.", field: "isDraft" });
  }

  for (const link of input.brokenInternalLinks) {
    issues.push({ severity: "error", code: "CMS_BROKEN_INTERNAL_LINK", message: `Internal link "${link}" does not resolve to a real page.`, field: "content" });
  }

  for (const image of input.brokenBannerImageUrls) {
    issues.push({ severity: "error", code: "CMS_BROKEN_IMAGE_REFERENCE", message: `Referenced image "${image}" is not a recognized uploaded asset.`, field: "content" });
  }

  if (!input.isDraft) {
    issues.push(...validateSeoMetadata(input.seo, "cms"));
  }

  return issues;
}
