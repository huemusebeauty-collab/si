import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.1/7.3.5 — Banner validation. Kept separate from the CMS
// page validator (distinct entity, distinct rules — a banner has no
// slug/SEO metadata of its own) rather than folding it in, per Phase 6
// §9's treatment of banners as their own content type.
export interface BannerValidationInput {
  placement: string;
  imageUrl: string;
  imageAltText?: string;
  headline?: string;
  ctaUrl?: string;
  ctaUrlIsBroken: boolean; // computed by caller
  startAt: Date;
  endAt: Date;
}

export function validateBanner(input: BannerValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.placement?.trim()) {
    issues.push({ severity: "error", code: "BANNER_MISSING_PLACEMENT", message: "Banner placement is required.", field: "placement" });
  }
  if (!input.imageUrl?.trim()) {
    issues.push({ severity: "error", code: "BANNER_MISSING_IMAGE", message: "Banner image is required.", field: "imageUrl" });
  }
  if (!input.imageAltText?.trim()) {
    issues.push({ severity: "error", code: "BANNER_MISSING_ALT_TEXT", message: "Banner image has no alt text.", field: "imageAltText" });
  }
  if (input.ctaUrl && input.ctaUrlIsBroken) {
    issues.push({ severity: "error", code: "BANNER_BROKEN_CTA_LINK", message: `Banner CTA link "${input.ctaUrl}" does not resolve.`, field: "ctaUrl" });
  }
  if (input.startAt >= input.endAt) {
    issues.push({ severity: "error", code: "BANNER_INVALID_DATE_RANGE", message: "Banner start date must be before its end date.", field: "startAt" });
  }
  const now = new Date();
  if (input.endAt < now) {
    issues.push({ severity: "warning", code: "BANNER_ALREADY_EXPIRED", message: "Banner's active window has already ended.", field: "endAt" });
  }

  return issues;
}
