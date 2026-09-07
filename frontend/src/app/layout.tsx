import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "@/styles/globals.css";
import { SITE_CONFIG } from "@/config/site";

// Sprint 2.8 — Performance: next/font self-hosts and subsets Google
// Fonts at build time — no runtime request to fonts.googleapis.com, no
// layout shift (font-display: swap is Next's default here), matches
// Phase 4 §3 font family choices exactly (Fraunces display / Inter UI).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Sprint 2.9 — SEO & AI Search Readiness: default metadata + Open Graph.
// Per-page metadata (title/description/canonical) is set via each route's
// own `generateMetadata` / `metadata` export, inheriting these defaults.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.name,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  openGraph: {
    type: "website",
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    images: [{ url: SITE_CONFIG.defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
