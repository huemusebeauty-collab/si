// Shared frontend product contract. API adapters map backend responses into this shape.

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
  mrp?: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  price: number;
  salePrice?: number;
  mrp?: number;
  currency: string;
  imageUrl: string;
  imageUrls: string[];
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
