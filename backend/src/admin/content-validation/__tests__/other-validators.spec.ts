import { validateCategory } from "../validators/category.validator";
import { validateCollection } from "../validators/collection.validator";
import { validateCmsPage } from "../validators/cms.validator";
import { validateBanner } from "../validators/banner.validator";
import { validateFaq } from "../validators/faq.validator";
import { validateNotificationTemplate } from "../validators/notification-template.validator";
import { buildReport } from "../validation-result";

const seo = {
  metaTitle: "Title",
  metaDescription: "x".repeat(100),
  canonicalUrl: "https://example.com",
  ogTitle: "t",
  ogDescription: "d",
  ogImageUrl: "https://example.com/i.jpg",
  jsonLd: {},
};

describe("validateCategory", () => {
  it("flags a duplicate slug", () => {
    const issues = validateCategory({ name: "Nail Collection", slug: "nail-collection", slugAlreadyExists: true, parentExists: true, visible: true, displayOrder: 0, seo });
    expect(issues.some((i) => i.code === "CATEGORY_DUPLICATE_SLUG")).toBe(true);
  });
  it("flags a category as its own parent", () => {
    const issues = validateCategory({ name: "A", slug: "a", slugAlreadyExists: false, parentSlug: "a", parentExists: true, visible: true, displayOrder: 0, seo });
    expect(issues.some((i) => i.code === "CATEGORY_SELF_PARENT")).toBe(true);
  });
  it("flags a non-existent parent", () => {
    const issues = validateCategory({ name: "A", slug: "a", slugAlreadyExists: false, parentSlug: "ghost", parentExists: false, visible: true, displayOrder: 0, seo });
    expect(issues.some((i) => i.code === "CATEGORY_INVALID_PARENT")).toBe(true);
  });
});

describe("validateCollection", () => {
  it("warns on an empty product list", () => {
    const issues = validateCollection({ name: "Spring", slug: "spring", slugAlreadyExists: false, featured: false, productIds: [], displayOrder: 0, seo });
    expect(issues.some((i) => i.code === "COLLECTION_NO_PRODUCTS")).toBe(true);
  });
  it("flags an invalid active-date range (end before start)", () => {
    const issues = validateCollection({
      name: "Spring", slug: "spring", slugAlreadyExists: false, featured: false, productIds: ["p1"], displayOrder: 0,
      startAt: new Date("2026-06-01"), endAt: new Date("2026-01-01"), seo,
    });
    expect(issues.some((i) => i.code === "COLLECTION_INVALID_DATE_RANGE")).toBe(true);
  });
});

describe("validateCmsPage", () => {
  it("flags a broken internal link", () => {
    const issues = validateCmsPage({
      slug: "about", slugAlreadyExists: false, title: "About", content: "See our [FAQ](/pages/nope)", isDraft: false,
      internalLinks: ["/pages/nope"], brokenInternalLinks: ["/pages/nope"], bannerImageUrls: [], brokenBannerImageUrls: [], seo,
    });
    expect(issues.some((i) => i.code === "CMS_BROKEN_INTERNAL_LINK")).toBe(true);
  });
  it("skips SEO checks for a draft page", () => {
    const issues = validateCmsPage({
      slug: "about", slugAlreadyExists: false, title: "About", content: "content", isDraft: true,
      internalLinks: [], brokenInternalLinks: [], bannerImageUrls: [], brokenBannerImageUrls: [], seo: {},
    });
    expect(issues.some((i) => i.code.startsWith("CMS_MISSING_META"))).toBe(false);
  });
});

describe("validateBanner", () => {
  it("flags a missing alt text", () => {
    const issues = validateBanner({ placement: "hero", imageUrl: "img.jpg", ctaUrlIsBroken: false, startAt: new Date(), endAt: new Date(Date.now() + 1000) });
    expect(issues.some((i) => i.code === "BANNER_MISSING_ALT_TEXT")).toBe(true);
  });
  it("flags an already-expired banner as a warning", () => {
    const issues = validateBanner({
      placement: "hero", imageUrl: "img.jpg", imageAltText: "alt", ctaUrlIsBroken: false,
      startAt: new Date("2020-01-01"), endAt: new Date("2020-02-01"),
    });
    expect(issues.some((i) => i.code === "BANNER_ALREADY_EXPIRED")).toBe(true);
  });
});

describe("validateFaq", () => {
  it("suggests rephrasing a question without a question mark", () => {
    const issues = validateFaq({ question: "How do I apply this", answer: "Apply two thin coats and let dry between each." });
    expect(issues.some((i) => i.code === "FAQ_QUESTION_NOT_PHRASED_AS_QUESTION")).toBe(true);
  });
});

describe("validateNotificationTemplate", () => {
  it("flags a missing required variable", () => {
    const issues = validateNotificationTemplate({
      templateKey: "orderConfirmation", subject: "Order confirmed", html: "<p>Thanks!</p>", text: "Thanks!",
      requiredVariables: ["firstName", "orderId"],
    });
    expect(issues.some((i) => i.code === "TEMPLATE_MISSING_REQUIRED_VARIABLE")).toBe(true);
  });
  it("passes when all required variables are present", () => {
    const issues = validateNotificationTemplate({
      templateKey: "orderConfirmation", subject: "Order {{orderId}} confirmed", html: "<p>Hi {{firstName}}, order {{orderId}} confirmed.</p>", text: "Hi {{firstName}}",
      requiredVariables: ["firstName", "orderId"],
    });
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("buildReport", () => {
  it("marks isValid true when there are no error-severity issues", () => {
    const report = buildReport("product", [{ severity: "warning", code: "X", message: "y" }]);
    expect(report.isValid).toBe(true);
  });
  it("marks isValid false when there is at least one error", () => {
    const report = buildReport("product", [{ severity: "error", code: "X", message: "y" }]);
    expect(report.isValid).toBe(false);
  });
});
