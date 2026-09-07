import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.7 — SEO Validation. Reused by Product/Category/Collection/
// CMS validators rather than each reimplementing meta-title/description
// length checks — the one place this logic exists.
export interface SeoMetadataInput {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  twitterCard?: string;
  jsonLd?: unknown;
  robotsDirective?: string;
}

// Length limits per Phase 2 §14 / Phase 9 §11 SEO Content Standards.
const META_TITLE_MAX = 60;
const META_DESCRIPTION_MIN = 70;
const META_DESCRIPTION_MAX = 160;

export function validateSeoMetadata(seo: SeoMetadataInput, prefix = "seo"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!seo.metaTitle) {
    issues.push({ severity: "error", code: `${prefix.toUpperCase()}_MISSING_META_TITLE`, message: "Meta title is required.", field: "metaTitle" });
  } else if (seo.metaTitle.length > META_TITLE_MAX) {
    issues.push({
      severity: "warning",
      code: `${prefix.toUpperCase()}_META_TITLE_TOO_LONG`,
      message: `Meta title is ${seo.metaTitle.length} characters — search engines typically truncate past ${META_TITLE_MAX}.`,
      field: "metaTitle",
    });
  }

  if (!seo.metaDescription) {
    issues.push({ severity: "error", code: `${prefix.toUpperCase()}_MISSING_META_DESCRIPTION`, message: "Meta description is required.", field: "metaDescription" });
  } else if (seo.metaDescription.length > META_DESCRIPTION_MAX) {
    issues.push({
      severity: "warning",
      code: `${prefix.toUpperCase()}_META_DESCRIPTION_TOO_LONG`,
      message: `Meta description is ${seo.metaDescription.length} characters — over the ${META_DESCRIPTION_MAX} typically shown.`,
      field: "metaDescription",
    });
  } else if (seo.metaDescription.length < META_DESCRIPTION_MIN) {
    issues.push({
      severity: "suggestion",
      code: `${prefix.toUpperCase()}_META_DESCRIPTION_SHORT`,
      message: `Meta description is under ${META_DESCRIPTION_MIN} characters — there's room to say more before it's truncated.`,
      field: "metaDescription",
    });
  }

  if (!seo.canonicalUrl) {
    issues.push({ severity: "warning", code: `${prefix.toUpperCase()}_MISSING_CANONICAL_URL`, message: "No canonical URL set.", field: "canonicalUrl" });
  }

  if (!seo.ogTitle || !seo.ogDescription || !seo.ogImageUrl) {
    issues.push({
      severity: "warning",
      code: `${prefix.toUpperCase()}_INCOMPLETE_OPEN_GRAPH`,
      message: "Open Graph fields (title/description/image) are incomplete — social shares will look wrong or generic.",
      field: "openGraph",
    });
  }

  if (!seo.twitterCard) {
    issues.push({ severity: "suggestion", code: `${prefix.toUpperCase()}_MISSING_TWITTER_CARD`, message: "No Twitter Card type set.", field: "twitterCard" });
  }

  if (!seo.jsonLd) {
    issues.push({ severity: "warning", code: `${prefix.toUpperCase()}_MISSING_JSONLD`, message: "No structured data (JSON-LD) present.", field: "jsonLd" });
  }

  if (!seo.robotsDirective) {
    issues.push({
      severity: "suggestion",
      code: `${prefix.toUpperCase()}_MISSING_ROBOTS_DIRECTIVE`,
      message: "No explicit robots directive — defaults to indexable, confirm that's intended.",
      field: "robotsDirective",
    });
  }

  return issues;
}
