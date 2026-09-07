import { ProductCard } from "@/components/composite/ProductCard";
import { EmptyState } from "@/components/patterns/EmptyState";
import type { Product } from "@/types/product";

// Product Listing Grid — Phase 4 §17 Page Section. Used by Shop,
// Category, Collection, and Search results pages.
export function ProductListingGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        heading="No products found"
        body="Try adjusting your filters or search terms."
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
