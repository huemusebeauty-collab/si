"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/basic/Icon";
import { SearchBar } from "@/components/composite/SearchBar";
import { MegaMenu } from "@/components/sections/MegaMenu";
import { MobileMenu } from "@/components/sections/MobileMenu";
import { ROUTES } from "@/constants/routes";
import type { Category } from "@/types/product";

export function Header({ categories }: { categories: Category[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaMenuCategoryId, setMegaMenuCategoryId] = useState<string | null>(null);
  const megaMenuCategory = categories.find((c) => c.id === megaMenuCategoryId) ?? null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-fog bg-white">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button
            type="button"
            className="sm:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Icon size={24} label="">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </Icon>
          </button>

          <Link href={ROUTES.home} className="font-display text-[24px] font-semibold text-primary-plum">
            Hue Muse Beauty
          </Link>

          <nav aria-label="Main" className="hidden gap-6 sm:flex" onMouseLeave={() => setMegaMenuCategoryId(null)}>
            {categories.map((cat) => (
              <div key={cat.id} onMouseEnter={() => setMegaMenuCategoryId(cat.id)}>
                <Link
                  href={ROUTES.category(cat.slug)}
                  className="text-[15px] font-semibold text-ink hover:text-primary-rose"
                  aria-expanded={megaMenuCategoryId === cat.id}
                >
                  {cat.name}
                </Link>
              </div>
            ))}
          </nav>

          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar suggestions={["Muse Rose Nail Lacquer", "Plum Velvet Lipstick", "Hydra-Glow Serum"]} />
          </div>

          <div className="flex items-center gap-4">
            <Link href={ROUTES.account} aria-label="Account">
              <Icon size={24} label="">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </Icon>
            </Link>
            <Link href={ROUTES.wishlist} aria-label="Wishlist">
              <Icon size={24} label="">
                <path d="M12 21s-7-4.4-9.5-8.8C.7 8.6 2.3 5 6 5c2 0 3.4 1 6 3.5C14.6 6 16 5 18 5c3.7 0 5.3 3.6 3.5 7.2C19 16.6 12 21 12 21z" />
              </Icon>
            </Link>
            <Link href={ROUTES.cart} aria-label="Cart, 0 items">
              <Icon size={24} label="">
                <path d="M3 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
              </Icon>
            </Link>
          </div>
        </div>

        {megaMenuCategory && (
          <div onMouseEnter={() => setMegaMenuCategoryId(megaMenuCategory.id)} onMouseLeave={() => setMegaMenuCategoryId(null)}>
            <MegaMenu category={megaMenuCategory} />
          </div>
        )}
      </header>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} categories={categories} />
    </>
  );
}
