import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { CollectionCard } from "@/components/composite/CollectionCard";
import { getAllCollections } from "@/services/api/products";

export const metadata: Metadata = {
  title: "Collections | Silku",
  description: "Explore the latest Silku beauty collections.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getAllCollections();

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Silku Collections</h1>
      <p className="mt-2 max-w-xl text-base text-stone">Discover curated colour stories and beauty edits from Silku.</p>
      {collections.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-fog bg-white p-8 text-stone">Collections will appear here soon.</div>
      )}
    </div>
  );
}
