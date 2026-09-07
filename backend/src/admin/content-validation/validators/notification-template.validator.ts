import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.1 — Notification Template Validation (listed among the
// content types ContentValidationService supports). Validates the
// Sprint 5.4 email template shape (subject/html/text + the
// {{variable}} placeholders the Sprint 5.4 template engine expects).
export interface NotificationTemplateValidationInput {
  templateKey: string; // e.g. "orderConfirmation"
  subject: string;
  html: string;
  text: string;
  requiredVariables: string[]; // e.g. ["firstName", "orderId", "total"]
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

function extractPlaceholders(value: string): Set<string> {
  const found = new Set<string>();
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) found.add(match[1]);
  return found;
}

export function validateNotificationTemplate(input: NotificationTemplateValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.subject?.trim()) {
    issues.push({ severity: "error", code: "TEMPLATE_MISSING_SUBJECT", message: `Template "${input.templateKey}" has no subject line.`, field: "subject" });
  }
  if (!input.html?.trim()) {
    issues.push({ severity: "error", code: "TEMPLATE_MISSING_HTML", message: `Template "${input.templateKey}" has no HTML body.`, field: "html" });
  }
  if (!input.text?.trim()) {
    issues.push({ severity: "warning", code: "TEMPLATE_MISSING_TEXT", message: `Template "${input.templateKey}" has no plain-text fallback.`, field: "text" });
  }

  const usedInHtml = extractPlaceholders(input.html ?? "");
  const usedInSubject = extractPlaceholders(input.subject ?? "");
  const allUsed = new Set([...usedInHtml, ...usedInSubject]);

  for (const required of input.requiredVariables) {
    if (!allUsed.has(required)) {
      issues.push({
        severity: "error",
        code: "TEMPLATE_MISSING_REQUIRED_VARIABLE",
        message: `Template "${input.templateKey}" is missing the required {{${required}}} placeholder.`,
        field: "html",
      });
    }
  }
  for (const used of allUsed) {
    if (!input.requiredVariables.includes(used)) {
      issues.push({
        severity: "warning",
        code: "TEMPLATE_UNKNOWN_VARIABLE",
        message: `Template "${input.templateKey}" references {{${used}}}, which isn't in its known variable list — it will render literally if never supplied.`,
        field: "html",
      });
    }
  }

  return issues;
}
