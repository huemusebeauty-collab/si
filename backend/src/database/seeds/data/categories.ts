// Sprint 7.4 — Category hierarchy. Five main categories are fixed per
// Phase 1 §4 (unchanged since Sprint 3's seed); Sprint 7.4 adds the 16
// named subcategories, nested under whichever main category they
// actually belong to per Phase 2's product taxonomy — not evenly split,
// since nail/color-cosmetics genuinely have more subcategories than
// skincare does in this catalog.
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
    ],
  },
  {
    slug: "skincare",
    name: "Skincare",
    displayOrder: 3,
    children: [
      { slug: "foundation", name: "Foundation", displayOrder: 1 },
      { slug: "concealer", name: "Concealer", displayOrder: 2 },
      { slug: "compact-powder", name: "Compact Powder", displayOrder: 3 },
      { slug: "primer", name: "Primer", displayOrder: 4 },
    ],
  },
  { slug: "hair-care", name: "Hair Care", displayOrder: 4 },
  { slug: "beauty-accessories", name: "Beauty Accessories", displayOrder: 5 },
];
