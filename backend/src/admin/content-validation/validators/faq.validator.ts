import type { ValidationIssue } from "../validation-result";

// Sprint 7.3.1 — FAQ validation, per Phase 9 §10.
export interface FaqValidationInput {
  question: string;
  answer: string;
}

export function validateFaq(input: FaqValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.question?.trim()) {
    issues.push({ severity: "error", code: "FAQ_MISSING_QUESTION", message: "FAQ question is required.", field: "question" });
  } else if (!input.question.trim().endsWith("?")) {
    issues.push({ severity: "suggestion", code: "FAQ_QUESTION_NOT_PHRASED_AS_QUESTION", message: `"${input.question}" doesn't end in a question mark — confirm this is phrased as a question.`, field: "question" });
  }
  if (!input.answer?.trim()) {
    issues.push({ severity: "error", code: "FAQ_MISSING_ANSWER", message: "FAQ answer is required.", field: "answer" });
  } else if (input.answer.trim().length < 10) {
    issues.push({ severity: "warning", code: "FAQ_ANSWER_TOO_SHORT", message: "FAQ answer is very short — confirm it actually answers the question.", field: "answer" });
  }
  return issues;
}
