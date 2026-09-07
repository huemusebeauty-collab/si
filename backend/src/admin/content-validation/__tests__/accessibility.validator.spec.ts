import { validateAccessibility } from "../validators/accessibility.validator";

describe("validateAccessibility", () => {
  it("passes fully valid content with zero errors", () => {
    const issues = validateAccessibility({
      images: [{ url: "img.jpg", altText: "A bottle of Muse Rose nail lacquer" }],
      headings: [{ level: 1, text: "Title" }, { level: 2, text: "Subtitle" }],
      links: [{ href: "/shop", label: "Shop the collection" }],
      buttons: [{ label: "Add to Cart" }],
      colorContrastNotes: "Uses only approved Phase 4 tokens.",
    });
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("flags an image with no alt text", () => {
    const issues = validateAccessibility({ images: [{ url: "img.jpg", altText: "" }] });
    expect(issues.some((i) => i.code === "A11Y_MISSING_ALT_TEXT")).toBe(true);
  });

  it("flags generic/placeholder alt text", () => {
    const issues = validateAccessibility({ images: [{ url: "img.jpg", altText: "image1" }] });
    expect(issues.some((i) => i.code === "A11Y_GENERIC_ALT_TEXT")).toBe(true);
  });

  it("flags a skipped heading level (h1 to h3)", () => {
    const issues = validateAccessibility({ headings: [{ level: 1, text: "A" }, { level: 3, text: "B" }] });
    expect(issues.some((i) => i.code === "A11Y_SKIPPED_HEADING_LEVEL")).toBe(true);
  });

  it("allows a sequential heading structure (h1 to h2)", () => {
    const issues = validateAccessibility({ headings: [{ level: 1, text: "A" }, { level: 2, text: "B" }] });
    expect(issues.some((i) => i.code === "A11Y_SKIPPED_HEADING_LEVEL")).toBe(false);
  });

  it("flags a link with no label", () => {
    const issues = validateAccessibility({ links: [{ href: "/shop", label: "" }] });
    expect(issues.some((i) => i.code === "A11Y_MISSING_LINK_LABEL")).toBe(true);
  });

  it("flags a non-descriptive link label", () => {
    const issues = validateAccessibility({ links: [{ href: "/shop", label: "click here" }] });
    expect(issues.some((i) => i.code === "A11Y_NONDESCRIPTIVE_LINK_LABEL")).toBe(true);
  });

  it("flags a button with no label", () => {
    const issues = validateAccessibility({ buttons: [{ label: "" }] });
    expect(issues.some((i) => i.code === "A11Y_MISSING_BUTTON_LABEL")).toBe(true);
  });

  it("suggests a contrast review note when none is given", () => {
    const issues = validateAccessibility({});
    expect(issues.some((i) => i.code === "A11Y_NO_CONTRAST_REVIEW_NOTE" && i.severity === "suggestion")).toBe(true);
  });
});
