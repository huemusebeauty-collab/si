import type { Metadata } from "next";
import { ProductListingGrid } from "@/components/sections/ProductListingGrid";
import { getAllProducts } from "@/services/api/products";

export const metadata: Metadata = {
  title: "Search Results",
  robots: { index: false },
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q ?? "";
  const allProducts = query ? await getAllProducts() : [];
  const results = query
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="py-6">
      <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">
        {query ? `Results for "${query}"` : "Search"}
      </h1>
      <p className="mt-1 text-[13px] leading-[18px] text-stone">{results.length} results</p>
      <div className="mt-6">
        <ProductListingGrid products={results} />
      </div>
    </div>
  );
}
