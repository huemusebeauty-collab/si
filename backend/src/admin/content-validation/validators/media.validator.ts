import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.6 — Media Validation. File type/size checks already exist
// as REAL enforcement in StorageService.validate() (Sprint 3.8) at
// upload time — this validator does NOT duplicate that (Sprint 7.3's
// own "do not duplicate validation logic" instruction) — it covers the
// checks that only make sense once a file is *referenced by content*
// (alt text, duplicate detection across the library, broken references),
// which StorageService has no reason to know about at upload time.
export interface MediaValidationInput {
  url: string;
  altText?: string;
  widthPx?: number;
  heightPx?: number;
  fileSizeBytes?: number;
  isDuplicateOf?: string; // computed by caller: another asset's URL with matching content hash, if any
  isReferencedByAnyEntity: boolean; // computed by caller — false means an orphaned/broken reference somewhere pointed at this and got nothing
}

// Sprint 7.5 correction: these were hardcoded module-level constants,
// with a comment claiming they were "cited, not reimplemented, so the
// two can't drift silently" from StorageService's own constant — which
// was true only in the sense that BOTH were hardcoded independently
// and happened to agree, not because either actually read from a
// shared source. Sprint 7.5 made media settings genuinely configurable
// (BusinessSettingsEntity.maxUploadSizeBytes/minImageDimensionPx via
// SettingsService); this validator stays a pure function (no DB access,
// Sprint 7.3's architecture) by accepting the real configured limits as
// an optional parameter instead — ContentValidationService.
// validateMediaContent fetches them from SettingsService and passes
// them through. Defaults here match the entity's own column defaults,
// used only if a caller doesn't supply the real configured values.
export interface MediaLimits {
  maxFileSizeBytes: number;
  minDimensionPx: number;
}
const DEFAULT_LIMITS: MediaLimits = { maxFileSizeBytes: 8 * 1024 * 1024, minDimensionPx: 400 };

export function validateMedia(input: MediaValidationInput, limits: MediaLimits = DEFAULT_LIMITS): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.altText || input.altText.trim().length === 0) {
    issues.push({ severity: "error", code: "MEDIA_MISSING_ALT_TEXT", message: `Asset "${input.url}" has no alt text.`, field: "altText" });
  }

  if (input.widthPx !== undefined && input.heightPx !== undefined) {
    if (input.widthPx < limits.minDimensionPx || input.heightPx < limits.minDimensionPx) {
      issues.push({
        severity: "warning",
        code: "MEDIA_DIMENSIONS_TOO_SMALL",
        message: `Asset "${input.url}" is ${input.widthPx}x${input.heightPx}px — below the ${limits.minDimensionPx}px configured minimum.`,
        field: "dimensions",
      });
    }
  }

  if (input.fileSizeBytes !== undefined && input.fileSizeBytes > limits.maxFileSizeBytes) {
    issues.push({ severity: "error", code: "MEDIA_FILE_TOO_LARGE", message: `Asset "${input.url}" exceeds the ${Math.round(limits.maxFileSizeBytes / 1024 / 1024)}MB configured limit.`, field: "fileSizeBytes" });
  }

  if (input.isDuplicateOf) {
    issues.push({ severity: "suggestion", code: "MEDIA_DUPLICATE_DETECTED", message: `Asset "${input.url}" appears identical to an already-uploaded asset ("${input.isDuplicateOf}") — consider reusing it instead.`, field: "url" });
  }

  if (!input.isReferencedByAnyEntity) {
    issues.push({ severity: "suggestion", code: "MEDIA_ORPHANED", message: `Asset "${input.url}" isn't referenced by any product, page, or banner.`, field: "url" });
  }

  return issues;
}
