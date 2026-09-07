// Sprint 7.4 — CMS Content. Slugs align with the frontend's existing
// Sprint 2 STATIC_PAGES map (about, shipping-returns, faqs, privacy,
// terms, accessibility) where they already overlap, and add the
// remaining ones Sprint 7.4 explicitly asks for (contact, homepage,
// return-refund-policy) as new backend content — those three don't yet
// have a corresponding Sprint 2 frontend route, flagged in Known Issues
// rather than silently assumed to already work end-to-end (Sprint 2's
// frontend is frozen; wiring a new static-page route is a frontend
// change out of this content-only sprint's scope).
export interface CmsPageSeed {
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

export const CMS_PAGE_SEEDS: CmsPageSeed[] = [
  {
    slug: "homepage",
    title: "Hue Muse Beauty — Color That Tells Your Story",
    content:
      "This entry stores the homepage's SEO/meta content only — the homepage itself is component-composed (Hero, Category Grid, Collections, Best Sellers carousel; see Sprint 2's HomePage) rather than rendered from CMS page content, unlike the other static pages here.",
    metaTitle: "Hue Muse Beauty | Premium Nail Polish & Color Cosmetics",
    metaDescription: "Discover Hue Muse Beauty — luxury nail lacquer, color cosmetics, and skincare crafted for every shade story. Shop new arrivals and best sellers.",
  },
  {
    slug: "about",
    title: "About Hue Muse Beauty",
    content:
      "Hue Muse Beauty is a premium color cosmetics and nail lacquer brand built on craftsmanship and self-expression. Every formula is developed to perform as beautifully as it wears, from our signature nail lacquers to our color cosmetics line. We believe beauty should be personal — a form of self-expression, not a uniform. That's the muse behind everything we make.",
    metaTitle: "About Us | Hue Muse Beauty",
    metaDescription: "Learn about Hue Muse Beauty's story, our commitment to quality formulas, and the philosophy behind every shade we create.",
  },
  {
    slug: "contact",
    title: "Contact Us",
    content:
      "We're here to help with orders, product questions, and anything in between. Reach our support team at support@huemusebeauty.local or call us Monday-Friday, 9am-6pm ET. For order-specific questions, please have your order number ready.",
    metaTitle: "Contact Us | Hue Muse Beauty",
    metaDescription: "Get in touch with Hue Muse Beauty customer support for order help, product questions, and more.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "This Privacy Policy describes how Hue Muse Beauty collects, uses, and protects your personal information when you visit or make a purchase from our site. We collect information you provide directly (such as name, email, and shipping address), and we never sell your personal data to third parties. For questions about this policy, contact privacy@huemusebeauty.local.",
    metaTitle: "Privacy Policy | Hue Muse Beauty",
    metaDescription: "Read Hue Muse Beauty's Privacy Policy to understand how we collect, use, and protect your personal information.",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "These Terms of Service govern your use of the Hue Muse Beauty website and your purchase of products from us. By placing an order, you agree to these terms, including our pricing, shipping, and return policies as described elsewhere on this site. We reserve the right to update these terms; continued use of the site after changes constitutes acceptance.",
    metaTitle: "Terms of Service | Hue Muse Beauty",
    metaDescription: "Review Hue Muse Beauty's Terms of Service, covering site use, purchases, and policies.",
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    content:
      "Standard shipping arrives within 3-5 business days for most US addresses; expedited options are available at checkout. Orders over $50 ship free. Once your order ships, you'll receive a tracking number by email. We currently ship within the United States only.",
    metaTitle: "Shipping Policy | Hue Muse Beauty",
    metaDescription: "Learn about Hue Muse Beauty's shipping timelines, free shipping threshold, and tracking process.",
  },
  {
    slug: "return-refund-policy",
    title: "Return & Refund Policy",
    content:
      "We accept returns of unused, unopened products within 30 days of delivery for a full refund. To start a return, contact support@huemusebeauty.local with your order number. Refunds are issued to the original payment method within 5-7 business days of us receiving the returned item.",
    metaTitle: "Return & Refund Policy | Hue Muse Beauty",
    metaDescription: "Read Hue Muse Beauty's 30-day return and refund policy for unused, unopened products.",
  },
];
