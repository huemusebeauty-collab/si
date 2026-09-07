import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { FilterPanel } from "@/components/patterns/FilterPanel";
import { ProductListingGrid } from "@/components/sections/ProductListingGrid";
import { getCategoryBySlug, getProductsByCategory } from "@/services/api/products";

interface Props {
  params: { category: string };
  searchParams: { finish?: string | string[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.category);
  if (!category) return {};
  return {
    title: category.name,
    description: `Shop ${category.name} at Hue Muse Beauty.`,
    alternates: { canonical: `/shop/${category.slug}` },
  };
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug(params.category);
  if (!category) notFound();

  const allProducts = await getProductsByCategory(category);

  const finishValues = Array.from(
    new Set(allProducts.map((p) => p.finish).filter((f): f is string => Boolean(f) && f !== "N/A")),
  ).sort();
  const filterGroups = [
    {
      id: "finish",
      label: "Finish",
      options: finishValues.map((f) => ({ id: slugify(f), label: f })),
    },
  ];

  const selectedFinish = toArray(searchParams.finish);
  const products =
    selectedFinish.length > 0
      ? allProducts.filter((p) => p.finish && selectedFinish.includes(slugify(p.finish)))
      : allProducts;

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">{category.name}</h1>

      {category.subcategories && category.subcategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/shop/${sub.slug}`}
              className="rounded-full border border-fog px-3 py-1.5 text-[13px] leading-[18px] text-charcoal hover:border-primary-rose hover:text-primary-rose"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8 sm:flex-row">
        <FilterPanel groups={filterGroups} />
        <div className="flex-1">
          <ProductListingGrid products={products} />
        </div>
      </div>
    </div>
  );
}
