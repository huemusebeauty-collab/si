import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { CategoryDiscoveryGrid } from "@/components/sections/CategoryDiscoveryGrid";
import { RelatedCarousel } from "@/components/patterns/RelatedCarousel";
import { CollectionCard } from "@/components/composite/CollectionCard";
import { TrustSignalStrip } from "@/components/patterns/TrustSignalStrip";
import { getAllCategories, getAllCollections, getAllProducts } from "@/services/api/products";

export const metadata: Metadata = {
  title: "Premium Nail Polish & Color Cosmetics",
  description:
    "Discover Hue Muse Beauty — luxury nail lacquers, color cosmetics, and skincare crafted for every shade story.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, collections, products] = await Promise.all([
    getAllCategories(),
    getAllCollections(),
    getAllProducts(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Hue Muse Beauty",
            url: "https://www.huemusebeauty.com",
          }),
        }}
      />
      <Hero
        headline="Color that tells your story"
        subhead="Luxury nail lacquer and color cosmetics, crafted for every shade."
        ctaLabel="Shop New Arrivals"
        ctaHref="/shop"
        imageUrl="/mock/hero-home.jpg"
        imageAlt="Hue Muse Beauty product lineup on a marble surface"
      />
      <CategoryDiscoveryGrid categories={categories} />
      <section aria-label="Collections" className="py-8">
        <h2 className="mb-6 font-display text-[32px] leading-10 font-semibold text-ink">Featured Collections</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      </section>
      <RelatedCarousel title="Best Sellers" products={products} />
      <TrustSignalStrip />
    </>
  );
}
