// Sprint 7.3.9 — Validation Report: the standardized shape every
// validator (Product/Category/Collection/CMS/Media/SEO/Accessibility/
// Notification Template) returns, so a caller never has to branch on
// "which content type is this" to interpret a result.
export type ValidationSeverity = "error" | "warning" | "suggestion";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string; // stable machine-readable code, e.g. "PRODUCT_MISSING_SHORT_DESCRIPTION"
  message: string; // human-readable, per-issue explanation
  field?: string; // the specific field this issue is about, when applicable
}

export interface ValidationReport {
  contentType: string; // "product" | "category" | "collection" | "cmsPage" | "banner" | "media" | "notificationTemplate"
  entityId?: string; // undefined for a not-yet-created entity (e.g. import preview)
  isValid: boolean; // true iff there are zero "error"-severity issues (warnings/suggestions don't block)
  issues: ValidationIssue[];
  validatedAt: string; // ISO timestamp
}

// Sprint 7.3 — small helper so every validator constructs a report the
// same way rather than hand-assembling the object shape repeatedly.
export function buildReport(contentType: string, issues: ValidationIssue[], entityId?: string): ValidationReport {
  return {
    contentType,
    entityId,
    isValid: !issues.some((i) => i.severity === "error"),
    issues,
    validatedAt: new Date().toISOString(),
  };
}
