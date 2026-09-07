import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { ProductListingGrid } from "@/components/sections/ProductListingGrid";
import { getAllProducts } from "@/services/api/products";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const allProducts = await getAllProducts();
  const wishlisted = allProducts.slice(0, 2);
  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Wishlist" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Wishlist</h1>
      <div className="mt-6">
        <ProductListingGrid products={wishlisted} />
      </div>
    </div>
  );
}
