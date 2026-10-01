"use client";
import { useRef } from "react";
import { ProductCard } from "@/components/composite/ProductCard";
import type { Product } from "@/types/product";

export function RelatedCarousel({ title, products }: { title: string; products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (direction: "prev" | "next") => {
    scrollerRef.current?.scrollBy({
      left: direction === "next" ? scrollerRef.current.clientWidth * 0.82 : -scrollerRef.current.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  return (
    <section aria-label={title} className="py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-[32px] leading-10 font-semibold text-ink">{title}</h2>
        <div className="flex shrink-0 gap-2" aria-label={title + " carousel controls"}>
          <button type="button" onClick={() => scroll("prev")} aria-label={"Previous " + title}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone/30 bg-white text-ink shadow-rest transition hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-rose">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => scroll("next")} aria-label={"Next " + title}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone/30 bg-white text-ink shadow-rest transition hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-rose">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth" tabIndex={0} aria-label={title + " products"}>
        {products.map((p) => (
          <div key={p.id} className="w-64 shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
