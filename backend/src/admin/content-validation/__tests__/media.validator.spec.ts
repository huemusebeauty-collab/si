import { validateMedia } from "../validators/media.validator";

describe("validateMedia", () => {
  const valid = {
    url: "https://cdn.example.com/img.jpg",
    altText: "Muse Rose Nail Lacquer bottle on a marble surface",
    widthPx: 1200,
    heightPx: 1200,
    fileSizeBytes: 500_000,
    isReferencedByAnyEntity: true,
  };

  it("passes fully valid media with zero errors", () => {
    const issues = validateMedia(valid);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("flags missing alt text as an error", () => {
    const issues = validateMedia({ ...valid, altText: undefined });
    expect(issues.some((i) => i.code === "MEDIA_MISSING_ALT_TEXT" && i.severity === "error")).toBe(true);
  });

  it("flags dimensions below the minimum (boundary: 399px)", () => {
    const issues = validateMedia({ ...valid, widthPx: 399, heightPx: 399 });
    expect(issues.some((i) => i.code === "MEDIA_DIMENSIONS_TOO_SMALL")).toBe(true);
  });

  it("allows dimensions at exactly the minimum (boundary: 400px)", () => {
    const issues = validateMedia({ ...valid, widthPx: 400, heightPx: 400 });
    expect(issues.some((i) => i.code === "MEDIA_DIMENSIONS_TOO_SMALL")).toBe(false);
  });

  it("flags a file exceeding the size limit as an error", () => {
    const issues = validateMedia({ ...valid, fileSizeBytes: 9 * 1024 * 1024 });
    expect(issues.some((i) => i.code === "MEDIA_FILE_TOO_LARGE" && i.severity === "error")).toBe(true);
  });

  it("allows a file at exactly the size limit (boundary)", () => {
    const issues = validateMedia({ ...valid, fileSizeBytes: 8 * 1024 * 1024 });
    expect(issues.some((i) => i.code === "MEDIA_FILE_TOO_LARGE")).toBe(false);
  });

  it("flags a detected duplicate as a suggestion", () => {
    const issues = validateMedia({ ...valid, isDuplicateOf: "https://cdn.example.com/other.jpg" });
    const issue = issues.find((i) => i.code === "MEDIA_DUPLICATE_DETECTED");
    expect(issue?.severity).toBe("suggestion");
  });

  it("flags an orphaned (unreferenced) asset", () => {
    const issues = validateMedia({ ...valid, isReferencedByAnyEntity: false });
    expect(issues.some((i) => i.code === "MEDIA_ORPHANED")).toBe(true);
  });

  it("allows an asset that exceeds the DEFAULT limit but is within CONFIGURED (larger) limits", () => {
    // Sprint 7.5 — proves limits are genuinely parameterized, not just
    // renamed constants: a file that would fail the old hardcoded 8MB
    // default now passes when the caller supplies a larger configured
    // limit (e.g. from Settings).
    const issues = validateMedia({ ...valid, fileSizeBytes: 10 * 1024 * 1024 }, { maxFileSizeBytes: 20 * 1024 * 1024, minDimensionPx: 400 });
    expect(issues.some((i) => i.code === "MEDIA_FILE_TOO_LARGE")).toBe(false);
  });

  it("rejects an asset within the default limit but over a stricter CONFIGURED limit", () => {
    const issues = validateMedia({ ...valid, fileSizeBytes: 2 * 1024 * 1024 }, { maxFileSizeBytes: 1 * 1024 * 1024, minDimensionPx: 400 });
    expect(issues.some((i) => i.code === "MEDIA_FILE_TOO_LARGE")).toBe(true);
  });

  it("uses default limits when none are supplied (backward compatibility)", () => {
    const issues = validateMedia({ ...valid, fileSizeBytes: 9 * 1024 * 1024 });
    expect(issues.some((i) => i.code === "MEDIA_FILE_TOO_LARGE")).toBe(true); // 9MB exceeds the 8MB default
  });
});
