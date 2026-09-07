// Shared TypeScript types. Sprint 2 uses these against mock data only —
// they will be aligned to the real API response shape in Sprint 3+
// (backend) without changing component code, since components only ever
// consume these types, never raw API payloads directly.

export type ProductBadge = "New" | "Best Seller" | "Limited Edition" | "Luxury";

export type AvailabilityStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "coming-soon"
  | "pre-order";

export interface Shade {
  id: string;
  name: string;
  hex: string;
  inStock: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  price: number;
  salePrice?: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
  badges: ProductBadge[];
  availability: AvailabilityStatus;
  shadeCount?: number;
  shades?: Shade[];
  rating: number;
  reviewCount: number;
  description?: string;
  finish?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  itemCount: number;
  subcategories?: { id: string; slug: string; name: string }[];
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  imageUrl: string;
  imageAlt: string;
}

export interface Review {
  id: string;
  rating: number;
  reviewerName: string;
  verifiedPurchase: boolean;
  text: string;
  photoUrl?: string;
  date: string;
}

export interface CartLine {
  productId: string;
  productName: string;
  shadeName?: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}
