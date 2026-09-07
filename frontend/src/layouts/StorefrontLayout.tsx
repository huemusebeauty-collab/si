import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { getAllCategories } from "@/services/api/products";

export async function StorefrontLayout({ children }: { children: ReactNode }) {
  const categories = await getAllCategories();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header categories={categories} />
      <main id="main-content" className="mx-auto max-w-content px-4 sm:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
