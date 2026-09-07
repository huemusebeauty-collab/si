import { ProductCard } from "@/components/composite/ProductCard";
import type { Product } from "@/types/product";

// Related/Recommended Carousel — Phase 4 §17 Reusable Patterns. Sprint 2
// scope: horizontally scrollable row (CSS scroll-snap) against mock
// products; true recommendation logic is a backend/ML concern (out of
// scope).
export function RelatedCarousel({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="py-8">
      <h2 className="mb-4 font-display text-[32px] leading-10 font-semibold text-ink">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {products.map((p) => (
          <div key={p.id} className="w-64 shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
