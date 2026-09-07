import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { FilterPanel } from "@/components/patterns/FilterPanel";
import { ProductListingGrid } from "@/components/sections/ProductListingGrid";
import { getAllProducts } from "@/services/api/products";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Shop All",
  description: "Browse the full Hue Muse Beauty catalog — nail lacquer, color cosmetics, and skincare.",
  alternates: { canonical: "/shop" },
};

const PRICE_BUCKETS: Record<string, (p: Product) => boolean> = {
  "under-500": (p) => (p.salePrice ?? p.price) < 500,
  "500-800": (p) => (p.salePrice ?? p.price) >= 500 && (p.salePrice ?? p.price) <= 800,
  "over-800": (p) => (p.salePrice ?? p.price) > 800,
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Props {
  searchParams: { finish?: string | string[]; price?: string | string[] };
}

export default async function ShopPage({ searchParams }: Props) {
  const allProducts = await getAllProducts();

  const finishValues = Array.from(
    new Set(allProducts.map((p) => p.finish).filter((f): f is string => Boolean(f) && f !== "N/A")),
  ).sort();
  const filterGroups = [
    {
      id: "price",
      label: "Price",
      options: [
        { id: "under-500", label: "Under ₹500" },
        { id: "500-800", label: "₹500–₹800" },
        { id: "over-800", label: "Over ₹800" },
      ],
    },
    {
      id: "finish",
      label: "Finish",
      options: finishValues.map((f) => ({ id: slugify(f), label: f })),
    },
  ];

  const selectedFinish = toArray(searchParams.finish);
  const selectedPrice = toArray(searchParams.price);

  let products = allProducts;
  if (selectedFinish.length > 0) {
    products = products.filter((p) => p.finish && selectedFinish.includes(slugify(p.finish)));
  }
  if (selectedPrice.length > 0) {
    products = products.filter((p) => selectedPrice.some((bucket) => PRICE_BUCKETS[bucket]?.(p)));
  }

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Shop All</h1>
      <div className="mt-6 flex flex-col gap-8 sm:flex-row">
        <FilterPanel groups={filterGroups} />
        <div className="flex-1">
          <ProductListingGrid products={products} />
        </div>
      </div>
    </div>
  );
}
