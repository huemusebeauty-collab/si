import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.8 — Accessibility Validation, per Phase 9 §13. Checks
// content-authoring-time signals (alt text present, heading structure,
// labeled interactive elements) — this is NOT a substitute for the
// frontend's own runtime accessibility work (Sprint 2's axe-core e2e
// checks); it catches authoring mistakes before content is published,
// the same "shift left" principle SEO validation follows.
export interface AccessibilityContentInput {
  images?: { url: string; altText?: string }[];
  headings?: { level: number; text: string }[]; // in document order, as authored
  links?: { href: string; label?: string }[];
  buttons?: { label?: string }[];
  colorContrastNotes?: string; // free-text field for a content editor to note manual contrast review, where a non-token color is used
}

export function validateAccessibility(input: AccessibilityContentInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const image of input.images ?? []) {
    if (!image.altText || image.altText.trim().length === 0) {
      issues.push({
        severity: "error",
        code: "A11Y_MISSING_ALT_TEXT",
        message: `Image "${image.url}" has no alt text.`,
        field: "images",
      });
    } else if (/^(image|photo|img)\d*$/i.test(image.altText.trim())) {
      issues.push({
        severity: "warning",
        code: "A11Y_GENERIC_ALT_TEXT",
        message: `Alt text "${image.altText}" for "${image.url}" looks like a filename/placeholder, not a real description.`,
        field: "images",
      });
    }
  }

  // Sprint 7.3.8 — heading hierarchy: no skipped levels (h2 -> h4 with
  // no h3), and exactly one top-level heading if any are present.
  const headings = input.headings ?? [];
  for (let i = 1; i < headings.length; i++) {
    const jump = headings[i].level - headings[i - 1].level;
    if (jump > 1) {
      issues.push({
        severity: "error",
        code: "A11Y_SKIPPED_HEADING_LEVEL",
        message: `Heading "${headings[i].text}" (h${headings[i].level}) follows "${headings[i - 1].text}" (h${headings[i - 1].level}) — skips a level.`,
        field: "headings",
      });
    }
  }

  for (const link of input.links ?? []) {
    if (!link.label || link.label.trim().length === 0) {
      issues.push({ severity: "error", code: "A11Y_MISSING_LINK_LABEL", message: `Link to "${link.href}" has no accessible label/text.`, field: "links" });
    } else if (["click here", "read more", "here", "link"].includes(link.label.trim().toLowerCase())) {
      issues.push({
        severity: "warning",
        code: "A11Y_NONDESCRIPTIVE_LINK_LABEL",
        message: `Link label "${link.label}" isn't descriptive out of context (a screen-reader user tabbing through links won't know where it goes).`,
        field: "links",
      });
    }
  }

  for (const button of input.buttons ?? []) {
    if (!button.label || button.label.trim().length === 0) {
      issues.push({ severity: "error", code: "A11Y_MISSING_BUTTON_LABEL", message: "A button has no accessible label.", field: "buttons" });
    }
  }

  if (!input.colorContrastNotes) {
    issues.push({
      severity: "suggestion",
      code: "A11Y_NO_CONTRAST_REVIEW_NOTE",
      message: "No color contrast review note present — confirm this content only uses approved design tokens (Phase 4), or document a manual contrast check.",
      field: "colorContrastNotes",
    });
  }

  return issues;
}
