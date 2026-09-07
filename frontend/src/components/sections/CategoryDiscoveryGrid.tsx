import { CategoryCard } from "@/components/composite/CategoryCard";
import type { Category } from "@/types/product";

// Category Discovery Grid — Phase 4 §17 Page Section.
export function CategoryDiscoveryGrid({ categories }: { categories: Category[] }) {
  return (
    <section aria-label="Shop by category" className="py-12">
      <h2 className="mb-6 font-display text-[32px] leading-10 font-semibold text-ink">Shop by Category</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>
    </section>
  );
}
