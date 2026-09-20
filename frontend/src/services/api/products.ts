import type { AvailabilityStatus, Category, Collection, Product, Review } from "@/types/product";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

interface ApiEnvelope<T> { data: T; }

interface ApiProductVariant {
  id: string;
  sku: string;
  name: string;
  hexColor: string | null;
  stockState: "in-stock" | "low-stock" | "out-of-stock";
  stockQuantity: number;
  mrp: string;
}

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  mediaUrls: string[];
  category: { id: string; slug: string; name: string };
  price: string;
  salePrice: string | null;
  currency: string;
  status: string;
  visibility: string;
  variants: ApiProductVariant[];
  content?: { specifications?: Record<string, string> };
}

interface ApiProductList {
  items: ApiProduct[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  visible: boolean;
  displayOrder: number;
  children?: ApiCategory[];
}

interface ApiCollection {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  active: boolean;
  featured: boolean;
  products?: ApiProduct[];
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiEnvelope<T>;
    return body.data;
  } catch {
    return null;
  }
}

function overallAvailability(variants: ApiProductVariant[]): AvailabilityStatus {
  if (variants.some((v) => v.stockState === "in-stock")) return "in-stock";
  if (variants.some((v) => v.stockState === "low-stock")) return "low-stock";
  return "out-of-stock";
}

function normalizeImageKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function resolveVariantImage(mediaUrls: string[], variantName: string): string | undefined {
  const key = normalizeImageKey(variantName);
  if (!key) return undefined;
  return mediaUrls.find((url) => normalizeImageKey(url).includes(key));
}

function mapProduct(p: ApiProduct): Product {
  const imageUrls = p.mediaUrls.filter((url) => {
    const value = url.trim();
    return /^https?:\/\//.test(value) || value.startsWith("/");
  });
  const imageUrl = imageUrls[0] ?? "";
  const variantMrps = p.variants.map((v) => Number.parseFloat(v.mrp)).filter(Number.isFinite);
  const productMrp = variantMrps.length > 0 && variantMrps.every((mrp) => mrp === variantMrps[0]) ? variantMrps[0] : undefined;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.category.id,
    price: Number.parseFloat(p.price),
    salePrice: p.salePrice ? Number.parseFloat(p.salePrice) : undefined,
    mrp: productMrp,
    currency: p.currency,
    imageUrl,
    imageUrls,
    imageAlt: p.name,
    badges: [],
    availability: overallAvailability(p.variants),
    shadeCount: p.variants.length,
    shades: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      hex: v.hexColor ?? "#CCCCCC",
      inStock: v.stockState === "in-stock",
      mrp: Number.parseFloat(v.mrp),
      imageUrl: resolveVariantImage(imageUrls, v.name),
    })),
    rating: 0,
    reviewCount: 0,
    finish: p.content?.specifications?.finish,
    description: p.description,
  };
}

function categoryImageForSlug(_slug: string): string {
  // Category cards must not borrow a product image. A category image is only
  // shown when a real category asset is added to the API in a future contract.
  return "";
}

function mapCategory(c: ApiCategory, itemCount = 0): Category {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    imageUrl: categoryImageForSlug(c.slug),
    imageAlt: c.name,
    itemCount,
    subcategories: c.children?.map((child) => ({ id: child.id, slug: child.slug, name: child.name })),
  };
}

function collectionImageForSlug(_slug: string): string {
  // Collections must not borrow an unrelated product image.
  return "";
}

function mapCollection(c: ApiCollection): Collection {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    imageUrl: collectionImageForSlug(c.slug),
    imageAlt: c.name,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const list = await apiFetch<ApiProductList>("/products?pageSize=100");
  return list ? list.items.map(mapProduct) : [];
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const p = await apiFetch<ApiProduct>(`/products/${slug}`);
  return p ? mapProduct(p) : undefined;
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const list = await apiFetch<ApiProductList>(
    `/products?categorySlug=${encodeURIComponent(category.slug)}&pageSize=100`,
  );
  return list ? list.items.map(mapProduct) : [];
}

export async function getAllCategories(): Promise<Category[]> {
  const list = await apiFetch<ApiCategory[]>("/categories");
  return list ? list.map((c) => mapCategory(c)) : [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const c = await apiFetch<ApiCategory>(`/categories/${slug}`);
  return c ? mapCategory(c) : undefined;
}

export async function getAllCollections(): Promise<Collection[]> {
  const list = await apiFetch<ApiCollection[]>("/collections");
  return list ? list.map(mapCollection) : [];
}

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  const c = await apiFetch<ApiCollection>(`/collections/${slug}`);
  return c ? mapCollection(c) : undefined;
}

export async function getProductsForCollection(slug: string): Promise<Product[]> {
  const c = await apiFetch<ApiCollection>(`/collections/${slug}`);
  return c?.products ? c.products.map(mapProduct) : [];
}

export async function getReviewsForProduct(_productId: string): Promise<Review[]> {
  void _productId;
  return [];
}
