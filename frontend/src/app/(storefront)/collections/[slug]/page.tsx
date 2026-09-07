import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { ProductListingGrid } from "@/components/sections/ProductListingGrid";
import { getCollectionBySlug, getProductsForCollection } from "@/services/api/products";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.tagline,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: Props) {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) notFound();

  const products = await getProductsForCollection(params.slug);

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/shop" }, { label: collection.name }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">{collection.name}</h1>
      <p className="mt-2 max-w-xl text-base text-stone">{collection.tagline}</p>
      <div className="mt-6">
        <ProductListingGrid products={products} />
      </div>
    </div>
  );
}
