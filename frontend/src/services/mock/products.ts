// Sprint 2 — MOCK DATA ONLY. No network calls, no API client. This module
// exists purely so page components have realistic data shapes to render
// against; it is replaced by src/services/api/* in the sprint that adds
// real backend integration (out of scope here).
import type { Category, Collection, Product, Review } from "@/types/product";

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "nail-collection",
    slug: "nail-collection",
    name: "Nail Collection",
    imageUrl: "/mock/category-nail.jpg",
    imageAlt: "Assorted Hue Muse Beauty nail polish bottles",
    itemCount: 128,
  },
  {
    id: "color-cosmetics",
    slug: "color-cosmetics",
    name: "Color Cosmetics",
    imageUrl: "/mock/category-cosmetics.jpg",
    imageAlt: "Hue Muse Beauty lip and eye color products",
    itemCount: 64,
  },
  {
    id: "skincare",
    slug: "skincare",
    name: "Skincare",
    imageUrl: "/mock/category-skincare.jpg",
    imageAlt: "Hue Muse Beauty skincare product lineup",
    itemCount: 32,
  },
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: "spring-muse",
    slug: "spring-muse",
    name: "Spring Muse",
    tagline: "Soft pastels for the new season",
    imageUrl: "/mock/collection-spring.jpg",
    imageAlt: "Spring Muse collection editorial image",
  },
  {
    id: "elite-noir",
    slug: "elite-noir",
    name: "Élite Noir",
    tagline: "Deep, dramatic shades for evening",
    imageUrl: "/mock/collection-noir.jpg",
    imageAlt: "Élite Noir collection editorial image",
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "muse-rose-nail-lacquer",
    name: "Muse Rose Nail Lacquer",
    categoryId: "nail-collection",
    price: 18,
    currency: "USD",
    imageUrl: "/mock/product-001.jpg",
    imageAlt: "Muse Rose Nail Lacquer bottle",
    badges: ["Best Seller"],
    availability: "in-stock",
    shadeCount: 12,
    shades: [
      { id: "s-1", name: "Muse Rose", hex: "#B5486B", inStock: true },
      { id: "s-2", name: "Deep Berry", hex: "#4A1030", inStock: true },
      { id: "s-3", name: "Champagne", hex: "#E8DCC8", inStock: false },
    ],
    rating: 4.7,
    reviewCount: 342,
    description:
      "A long-wear, high-shine lacquer in Hue Muse Beauty's signature rose. Chip-resistant formula, one-coat coverage.",
  },
  {
    id: "p-002",
    slug: "plum-velvet-lipstick",
    name: "Plum Velvet Lipstick",
    categoryId: "color-cosmetics",
    price: 24,
    salePrice: 19,
    currency: "USD",
    imageUrl: "/mock/product-002.jpg",
    imageAlt: "Plum Velvet Lipstick tube",
    badges: ["New", "Limited Edition"],
    availability: "low-stock",
    rating: 4.5,
    reviewCount: 89,
    description: "A velvet-matte lipstick in deep plum, formulated for all-day comfort.",
  },
  {
    id: "p-003",
    slug: "gold-shimmer-topcoat",
    name: "Gold Shimmer Top Coat",
    categoryId: "nail-collection",
    price: 16,
    currency: "USD",
    imageUrl: "/mock/product-003.jpg",
    imageAlt: "Gold Shimmer Top Coat bottle",
    badges: ["Luxury"],
    availability: "out-of-stock",
    rating: 4.8,
    reviewCount: 210,
  },
  {
    id: "p-004",
    slug: "hydra-glow-serum",
    name: "Hydra-Glow Serum",
    categoryId: "skincare",
    price: 42,
    currency: "USD",
    imageUrl: "/mock/product-004.jpg",
    imageAlt: "Hydra-Glow Serum bottle",
    badges: [],
    availability: "in-stock",
    rating: 4.6,
    reviewCount: 154,
  },
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r-1",
    rating: 5,
    reviewerName: "A. Kapoor",
    verifiedPurchase: true,
    text: "This is my third repurchase — the formula never chips before day 7.",
    date: "2026-06-02",
  },
  {
    id: "r-2",
    rating: 4,
    reviewerName: "J. Fernandes",
    verifiedPurchase: true,
    text: "Beautiful color payoff, slightly long dry time.",
    date: "2026-05-18",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return MOCK_PRODUCTS.filter((p) => p.categoryId === categoryId);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return MOCK_CATEGORIES.find((c) => c.slug === slug);
}
