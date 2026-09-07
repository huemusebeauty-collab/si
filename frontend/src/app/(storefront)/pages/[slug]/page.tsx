import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";

// Static Pages — Sprint 2.5. Mock content keyed by slug; real CMS-backed
// content is a Sprint 3+/CMS-module concern (Phase 8 §1 Service Layer).
const STATIC_PAGES: Record<string, { title: string; body: string }> = {
  about: {
    title: "About Hue Muse Beauty",
    body: "Hue Muse Beauty is a premium color cosmetics and nail lacquer brand built on craftsmanship and self-expression.",
  },
  "shipping-returns": {
    title: "Shipping & Returns",
    body: "Standard shipping arrives in 3-5 business days. Returns are accepted within 30 days of delivery.",
  },
  faqs: {
    title: "Frequently Asked Questions",
    body: "Answers to common questions about orders, shades, and formulas.",
  },
  privacy: { title: "Privacy Policy", body: "Placeholder privacy policy content." },
  terms: { title: "Terms of Service", body: "Placeholder terms of service content." },
  accessibility: {
    title: "Accessibility Statement",
    body: "Hue Muse Beauty is committed to WCAG 2.1 AA conformance across the site.",
  },
};

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const page = STATIC_PAGES[params.slug];
  if (!page) return {};
  return { title: page.title, alternates: { canonical: `/pages/${params.slug}` } };
}

export default function StaticPage({ params }: Props) {
  const page = STATIC_PAGES[params.slug];
  if (!page) notFound();

  return (
    <div className="py-12">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">{page.title}</h1>
      <p className="prose-copy mt-4 text-base text-charcoal">{page.body}</p>
    </div>
  );
}
