import { validateProduct, type ProductValidationInput } from "../validators/product.validator";

// Sprint 7.3.10 — valid content, invalid content, boundary values,
// duplicate slugs, missing SEO fields.
function validProduct(overrides: Partial<ProductValidationInput> = {}): ProductValidationInput {
  return {
    name: "Muse Rose Nail Lacquer",
    slug: "muse-rose-nail-lacquer",
    slugAlreadyExists: false,
    description: "A long-wear, high-shine lacquer in our signature rose. Chip-resistant formula, one-coat coverage.",
    content: {
      shortDescription: "A glossy, chip-resistant rose lacquer for everyday wear.",
      keyBenefits: ["Resists chipping for 10 days", "One-coat opacity", "Fast-drying formula"],
      ingredients: "Full ingredient list here.",
    },
    price: 18,
    variants: [{ sku: "HMB-NL-001", name: "Muse Rose", skuAlreadyExists: false, stockQuantity: 50 }],
    mediaUrls: ["https://cdn.example.com/product.jpg"],
    seo: {
      metaTitle: "Muse Rose Nail Lacquer | Hue Muse Beauty",
      metaDescription: "Shop Muse Rose, our chip-resistant, one-coat nail lacquer in a glossy rose finish. Free shipping over $50.",
      canonicalUrl: "https://www.huemusebeauty.com/products/muse-rose-nail-lacquer",
      ogTitle: "Muse Rose Nail Lacquer",
      ogDescription: "A glossy, chip-resistant rose lacquer.",
      ogImageUrl: "https://cdn.example.com/product.jpg",
      jsonLd: { "@type": "Product" },
    },
    ...overrides,
  };
}

describe("validateProduct", () => {
  it("passes fully valid content with zero errors", () => {
    const issues = validateProduct(validProduct());
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("flags a missing name", () => {
    const issues = validateProduct(validProduct({ name: "" }));
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_NAME")).toBe(true);
  });

  it("flags a duplicate slug", () => {
    const issues = validateProduct(validProduct({ slugAlreadyExists: true }));
    expect(issues.some((i) => i.code === "PRODUCT_DUPLICATE_SLUG" && i.severity === "error")).toBe(true);
  });

  it("flags a sale price exceeding the regular price", () => {
    const issues = validateProduct(validProduct({ price: 20, salePrice: 25 }));
    expect(issues.some((i) => i.code === "PRODUCT_SALE_PRICE_EXCEEDS_PRICE")).toBe(true);
  });

  it("allows a sale price exactly equal to the regular price (boundary)", () => {
    const issues = validateProduct(validProduct({ price: 20, salePrice: 20 }));
    expect(issues.some((i) => i.code === "PRODUCT_SALE_PRICE_EXCEEDS_PRICE")).toBe(false);
  });

  it("flags a zero price (boundary)", () => {
    const issues = validateProduct(validProduct({ price: 0 }));
    expect(issues.some((i) => i.code === "PRODUCT_INVALID_PRICE")).toBe(true);
  });

  it("flags a duplicate SKU across products", () => {
    const issues = validateProduct(
      validProduct({ variants: [{ sku: "HMB-NL-001", name: "Muse Rose", skuAlreadyExists: true, stockQuantity: 50 }] }),
    );
    expect(issues.some((i) => i.code === "PRODUCT_DUPLICATE_SKU")).toBe(true);
  });

  it("flags two variants on the same product sharing a SKU", () => {
    const issues = validateProduct(
      validProduct({
        variants: [
          { sku: "SAME", name: "Shade A", skuAlreadyExists: false, stockQuantity: 10 },
          { sku: "SAME", name: "Shade B", skuAlreadyExists: false, stockQuantity: 10 },
        ],
      }),
    );
    expect(issues.some((i) => i.code === "PRODUCT_DUPLICATE_SKU_WITHIN_PRODUCT")).toBe(true);
  });

  it("flags negative stock (boundary: -1)", () => {
    const issues = validateProduct(
      validProduct({ variants: [{ sku: "X", name: "Shade", skuAlreadyExists: false, stockQuantity: -1 }] }),
    );
    expect(issues.some((i) => i.code === "PRODUCT_NEGATIVE_STOCK")).toBe(true);
  });

  it("allows zero stock (boundary: not negative)", () => {
    const issues = validateProduct(
      validProduct({ variants: [{ sku: "X", name: "Shade", skuAlreadyExists: false, stockQuantity: 0 }] }),
    );
    expect(issues.some((i) => i.code === "PRODUCT_NEGATIVE_STOCK")).toBe(false);
  });

  it("flags zero variants", () => {
    const issues = validateProduct(validProduct({ variants: [] }));
    expect(issues.some((i) => i.code === "PRODUCT_NO_VARIANTS")).toBe(true);
  });

  it("flags missing media", () => {
    const issues = validateProduct(validProduct({ mediaUrls: [] }));
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_MEDIA")).toBe(true);
  });

  it("flags missing ingredients", () => {
    const issues = validateProduct(validProduct({ content: { shortDescription: "ok", keyBenefits: ["a", "b", "c"] } }));
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_INGREDIENTS")).toBe(true);
  });

  it("flags a key-benefits count outside 3-5 (boundary: 2)", () => {
    const issues = validateProduct(validProduct({ content: { shortDescription: "ok", keyBenefits: ["a", "b"], ingredients: "x" } }));
    expect(issues.some((i) => i.code === "PRODUCT_KEY_BENEFITS_COUNT")).toBe(true);
  });

  it("allows exactly 3 key benefits (boundary)", () => {
    const issues = validateProduct(validProduct({ content: { shortDescription: "ok", keyBenefits: ["a", "b", "c"], ingredients: "x" } }));
    expect(issues.some((i) => i.code === "PRODUCT_KEY_BENEFITS_COUNT")).toBe(false);
  });

  it("flags missing SEO meta title", () => {
    const issues = validateProduct(validProduct({ seo: { metaDescription: "A description that is definitely long enough to pass the minimum length check for this test case." } }));
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_META_TITLE")).toBe(true);
  });

  it("flags missing SEO meta description", () => {
    const issues = validateProduct(validProduct({ seo: { metaTitle: "Title" } }));
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_META_DESCRIPTION")).toBe(true);
  });
});
