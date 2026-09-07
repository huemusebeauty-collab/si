// Sprint 7.4 — Collections. Five collections covering every type Sprint
// 7.4 names (Featured/Seasonal/Trending/New Arrivals/Best Sellers),
// each written per Phase 9 §5's Collection Content Standards table
// (distinct tone per collection type — see comments).
export interface CollectionSeed {
  slug: string;
  name: string;
  tagline: string;
  featured: boolean;
  displayOrder: number;
  metaTitle: string;
  metaDescription: string;
}

export const COLLECTION_SEEDS: CollectionSeed[] = [
  {
    // Phase 9 §5 "Luxe": confident, polished tone — elevated formulation framing.
    slug: "luxe-essentials",
    name: "Luxe Essentials",
    tagline: "Elevated formulas for your everyday routine",
    featured: true,
    displayOrder: 1,
    metaTitle: "Luxe Essentials Collection | Hue Muse Beauty",
    metaDescription: "Shop Luxe Essentials — elevated, high-performance formulas across nail, lip, and face for a polished everyday routine.",
  },
  {
    // Phase 9 §5 "New Arrivals": energetic but factual, no false urgency.
    slug: "new-arrivals",
    name: "New Arrivals",
    tagline: "Just landed — the newest additions to the lineup",
    featured: true,
    displayOrder: 2,
    metaTitle: "New Arrivals | Hue Muse Beauty",
    metaDescription: "Discover what's new at Hue Muse Beauty — the latest nail, lip, and skin releases, freshly added to the catalog.",
  },
  {
    // Phase 9 §5 "Best Sellers": confident, evidence-led, references popularity.
    slug: "best-sellers",
    name: "Best Sellers",
    tagline: "The shades and formulas our customers keep repurchasing",
    featured: true,
    displayOrder: 3,
    metaTitle: "Best Sellers | Hue Muse Beauty",
    metaDescription: "Shop Hue Muse Beauty's best-selling nail, lip, and eye products — the formulas our customers repurchase again and again.",
  },
  {
    // Phase 9 §5 "Seasonal Collections": warm, occasion-specific.
    slug: "seasonal-holiday-shine",
    name: "Holiday Shine",
    tagline: "Warm metallics and festive shimmer for the season",
    featured: false,
    displayOrder: 4,
    metaTitle: "Holiday Shine Seasonal Collection | Hue Muse Beauty",
    metaDescription: "Shop Holiday Shine — warm metallic shades and festive shimmer finishes across nail and face, refreshed for the season.",
  },
  {
    // Phase 9 §5 "Limited Editions": direct about scarcity, real windows.
    slug: "limited-edition",
    name: "Limited Edition",
    tagline: "Available while supplies last — no restock planned",
    featured: false,
    displayOrder: 5,
    metaTitle: "Limited Edition Collection | Hue Muse Beauty",
    metaDescription: "Shop Limited Edition shades and finishes from Hue Muse Beauty — genuinely limited runs, not reprinted once sold out.",
  },
];

// Sprint 7.4 — "Trending" from the sprint's own deliverable list is
// intentionally NOT a persisted Collection row: Phase 8 §4's Collection
// entity models editorially-curated, admin-assigned product groupings
// (which "Trending" isn't — it's inherently a computed/algorithmic
// signal, e.g. recent order velocity). Modeling it as a static
// Collection would misrepresent it as a curated set rather than a live
// signal. Flagged in Known Issues as a Sprint 8+ feature (a
// `GET /v1/products?sort=trending` computed sort, not a new table row)
// rather than faked here as a hardcoded collection.
