// Sprint 7.4 — Category hierarchy. Five main categories are fixed per
// Phase 1 §4. This taxonomy keeps complexion makeup under Color Cosmetics
// and reserves Skincare for general face, sun, body, and treatment care.
export interface CategorySeedNode {
  slug: string;
  name: string;
  displayOrder: number;
  children?: CategorySeedNode[];
}

export const CATEGORY_TREE: CategorySeedNode[] = [
  {
    slug: "nail-collection",
    name: "Nail Collection",
    displayOrder: 1,
    children: [
      { slug: "nail-polish", name: "Nail Polish", displayOrder: 1 },
      { slug: "gel-polish", name: "Gel Polish", displayOrder: 2 },
      { slug: "base-coat", name: "Base Coat", displayOrder: 3 },
      { slug: "top-coat", name: "Top Coat", displayOrder: 4 },
      { slug: "nail-treatments", name: "Nail Treatments", displayOrder: 5 },
    ],
  },
  {
    slug: "color-cosmetics",
    name: "Color Cosmetics",
    displayOrder: 2,
    children: [
      { slug: "lipstick", name: "Lipstick", displayOrder: 1 },
      { slug: "lip-gloss", name: "Lip Gloss", displayOrder: 2 },
      { slug: "kajal", name: "Kajal", displayOrder: 3 },
      { slug: "eyeliner", name: "Eyeliner", displayOrder: 4 },
      { slug: "mascara", name: "Mascara", displayOrder: 5 },
      { slug: "blush", name: "Blush", displayOrder: 6 },
      { slug: "highlighter", name: "Highlighter", displayOrder: 7 },
      { slug: "foundation", name: "Foundation", displayOrder: 8 },
      { slug: "concealer", name: "Concealer", displayOrder: 9 },
      { slug: "compact-powder", name: "Compact Powder", displayOrder: 10 },
      { slug: "primer", name: "Primer", displayOrder: 11 },
    ],
  },
  {
    slug: "skincare",
    name: "Skincare",
    displayOrder: 3,
    children: [
      { slug: "face-wash", name: "Face Wash & Cleansers", displayOrder: 1 },
      { slug: "cleansing-balm", name: "Cleansing Balm & Oil", displayOrder: 2 },
      { slug: "toner", name: "Toners & Essences", displayOrder: 3 },
      { slug: "serum", name: "Serums", displayOrder: 4 },
      { slug: "moisturizer", name: "Moisturizers & Face Cream", displayOrder: 5 },
      { slug: "sunscreen", name: "Sunscreen & Sun Care", displayOrder: 6 },
      { slug: "face-scrub", name: "Face Scrubs & Exfoliators", displayOrder: 7 },
      { slug: "face-mask", name: "Face Masks", displayOrder: 8 },
      { slug: "eye-care", name: "Eye Care", displayOrder: 9 },
      { slug: "lip-care", name: "Lip Care", displayOrder: 10 },
      { slug: "body-lotion", name: "Body Lotion", displayOrder: 11 },
      { slug: "body-wash", name: "Body Wash", displayOrder: 12 },
      { slug: "body-scrub", name: "Body Scrub", displayOrder: 13 },
      { slug: "skin-treatments", name: "Skin Treatments", displayOrder: 14 },
    ],
  },
  { slug: "hair-care", name: "Hair Care", displayOrder: 4 },
  { slug: "beauty-accessories", name: "Beauty Accessories", displayOrder: 5 },
];
