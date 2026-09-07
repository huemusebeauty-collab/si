import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { ProductDetailSummary } from "@/components/sections/ProductDetailSummary";
import { ReviewCard } from "@/components/composite/ReviewCard";
import { Tabs } from "@/components/composite/Tabs";
import { RelatedCarousel } from "@/components/patterns/RelatedCarousel";
import { TrustSignalStrip } from "@/components/patterns/TrustSignalStrip";
import { getAllProducts, getProductBySlug, getReviewsForProduct } from "@/services/api/products";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? product.name,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { images: [{ url: product.imageUrl }] },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const [allProducts, reviews] = await Promise.all([getAllProducts(), getReviewsForProduct(product.id)]);
  const related = allProducts.filter((p) => p.id !== product.id);

  return (
    <div className="py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.imageUrl,
            description: product.description,
            offers: {
              "@type": "Offer",
              price: product.salePrice ?? product.price,
              priceCurrency: product.currency,
              availability:
                product.availability === "in-stock"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.rating,
              reviewCount: product.reviewCount,
            },
          }),
        }}
      />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: product.name },
        ]}
      />
      <div className="mt-4">
        <ProductDetailSummary product={product} />
      </div>

      <div className="mt-12">
        <Tabs
          items={[
            {
              id: "description",
              label: "Description",
              content: <p className="prose-copy text-base text-charcoal">{product.description}</p>,
            },
            {
              id: "reviews",
              label: `Reviews (${reviews.length})`,
              content: (
                <div>
                  {reviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

      <RelatedCarousel title="You May Also Like" products={related} />
      <TrustSignalStrip />
    </div>
  );
}
