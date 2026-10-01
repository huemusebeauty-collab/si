import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { CategoryDiscoveryGrid } from "@/components/sections/CategoryDiscoveryGrid";
import { RelatedCarousel } from "@/components/patterns/RelatedCarousel";
import { CollectionCard } from "@/components/composite/CollectionCard";
import { TrustSignalStrip } from "@/components/patterns/TrustSignalStrip";
import { getAllCategories, getAllCollections, getAllProducts } from "@/services/api/products";
import { getBanners } from "@/services/api/cms";

export const metadata: Metadata = {
  title: "Premium Nail Polish & Color Cosmetics | Silku",
  description:
    "Discover Silku — luxury nail lacquers, color cosmetics, and skincare crafted for every shade story.",
  alternates: { canonical: "/" },
};

const heroSlides = [
  { imageUrl: "/hero/hero-01.svg", imageAlt: "Silku beauty collection on a soft blush backdrop" },
  { imageUrl: "/hero/hero-02.svg", imageAlt: "Silku color cosmetics collection" },
  { imageUrl: "/hero/hero-03.svg", imageAlt: "Silku glow and color beauty collection" },
  { imageUrl: "/hero/hero-04.svg", imageAlt: "Silku everyday beauty essentials" },
  { imageUrl: "/hero/hero-05.svg", imageAlt: "Silku shades and beauty essentials" },
];

function withCategoryCounts(
  categories: Awaited<ReturnType<typeof getAllCategories>>,
  products: Awaited<ReturnType<typeof getAllProducts>>,
) {
  return categories.map((category) => {
    const categoryIds = new Set([category.id, ...(category.subcategories ?? []).map((child) => child.id)]);
    return {
      ...category,
      itemCount: products.filter((product) => categoryIds.has(product.categoryId)).length,
    };
  });
}

export default async function HomePage() {
  const [categories, collections, products, cmsBanners] = await Promise.all([
    getAllCategories(),
    getAllCollections(),
    getAllProducts(),
    getBanners("homepage-hero"),
  ]);
  const categoriesWithCounts = withCategoryCounts(categories, products);
  const managedHeroSlides = cmsBanners
    .filter((banner) => banner.imageUrl && !banner.imageUrl.startsWith("/mock/"))
    .map((banner) => ({
      imageUrl: banner.imageUrl,
      imageAlt: banner.imageAltText ?? banner.headline ?? "Silku Hero banner",
    }));
  const activeHeroSlides = managedHeroSlides.length > 0 ? managedHeroSlides : heroSlides;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Silku",
            url: "https://silku.in",
          }),
        }}
      />
      <Hero
        headline="Color that tells your story"
        subhead="Luxury nail lacquer and color cosmetics, crafted for every shade."
        ctaLabel="Shop New Arrivals"
        ctaHref="/shop"
        imageUrl={activeHeroSlides[0].imageUrl}
        imageAlt={activeHeroSlides[0].imageAlt}
        slides={activeHeroSlides.slice(1)}
      />
      <CategoryDiscoveryGrid categories={categoriesWithCounts} />
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
