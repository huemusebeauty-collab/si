import { validateSeoMetadata } from "../validators/seo.validator";

describe("validateSeoMetadata", () => {
  const valid = {
    metaTitle: "A Perfectly Reasonable Title",
    metaDescription: "A meta description that comfortably clears the seventy character minimum required by this validator's rules.",
    canonicalUrl: "https://example.com/page",
    ogTitle: "Title",
    ogDescription: "Description",
    ogImageUrl: "https://example.com/img.jpg",
    twitterCard: "summary_large_image",
    jsonLd: { "@type": "Thing" },
    robotsDirective: "index,follow",
  };

  it("passes fully valid SEO metadata with zero errors or warnings", () => {
    const issues = validateSeoMetadata(valid);
    expect(issues).toHaveLength(0);
  });

  it("flags a missing meta title as an error", () => {
    const issues = validateSeoMetadata({ ...valid, metaTitle: undefined });
    expect(issues.some((i) => i.code.includes("MISSING_META_TITLE") && i.severity === "error")).toBe(true);
  });

  it("flags a meta title over 60 chars as a warning (boundary: 61)", () => {
    const issues = validateSeoMetadata({ ...valid, metaTitle: "x".repeat(61) });
    expect(issues.some((i) => i.code.includes("META_TITLE_TOO_LONG"))).toBe(true);
  });

  it("allows a meta title at exactly 60 chars (boundary)", () => {
    const issues = validateSeoMetadata({ ...valid, metaTitle: "x".repeat(60) });
    expect(issues.some((i) => i.code.includes("META_TITLE_TOO_LONG"))).toBe(false);
  });

  it("flags a meta description under 70 chars as a suggestion (boundary: 69)", () => {
    const issues = validateSeoMetadata({ ...valid, metaDescription: "x".repeat(69) });
    expect(issues.some((i) => i.code.includes("META_DESCRIPTION_SHORT"))).toBe(true);
  });

  it("flags a meta description over 160 chars as a warning", () => {
    const issues = validateSeoMetadata({ ...valid, metaDescription: "x".repeat(161) });
    expect(issues.some((i) => i.code.includes("META_DESCRIPTION_TOO_LONG"))).toBe(true);
  });

  it("flags missing canonical URL", () => {
    const issues = validateSeoMetadata({ ...valid, canonicalUrl: undefined });
    expect(issues.some((i) => i.code.includes("MISSING_CANONICAL_URL"))).toBe(true);
  });

  it("flags incomplete Open Graph fields", () => {
    const issues = validateSeoMetadata({ ...valid, ogImageUrl: undefined });
    expect(issues.some((i) => i.code.includes("INCOMPLETE_OPEN_GRAPH"))).toBe(true);
  });

  it("flags missing JSON-LD", () => {
    const issues = validateSeoMetadata({ ...valid, jsonLd: undefined });
    expect(issues.some((i) => i.code.includes("MISSING_JSONLD"))).toBe(true);
  });

  it("flags missing robots directive as a suggestion, not an error", () => {
    const issues = validateSeoMetadata({ ...valid, robotsDirective: undefined });
    const issue = issues.find((i) => i.code.includes("MISSING_ROBOTS_DIRECTIVE"));
    expect(issue?.severity).toBe("suggestion");
  });
});
