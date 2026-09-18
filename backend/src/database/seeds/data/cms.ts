// Sprint 7.4 — CMS Content.
// Business-policy content is aligned with the current Silku storefront policy:
// India-only shipping, free shipping on purchases of ₹500 or more, 1–2 business
// day dispatch, 3–7 business day domestic delivery after dispatch, and eligible
// unused/unopened returns requested within 7 days of delivery.
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
    title: "Silku — Color That Tells Your Story",
    content:
      "This entry stores the homepage's SEO/meta content only — the homepage itself is component-composed rather than rendered from CMS page content.",
    metaTitle: "Silku | Premium Nail Polish & Color Cosmetics",
    metaDescription: "Discover Silku — beauty and cosmetic products crafted for everyday self-expression. Shop nail lacquer, color cosmetics, and more.",
  },
  {
    slug: "about",
    title: "About Silku",
    content:
      "Silku is a premium beauty and cosmetics brand built on craftsmanship and self-expression. Every product is designed to perform beautifully while giving customers freedom to express their personal style.",
    metaTitle: "About Us | Silku",
    metaDescription: "Learn about Silku, our commitment to quality beauty products, and the philosophy behind the products we create.",
  },
  {
    slug: "contact",
    title: "Contact Us",
    content:
      "We're here to help with orders, product questions, shipping, returns, and anything in between. Reach Silku support at silku981@gmail.com. For order-specific questions, please have your order number ready.",
    metaTitle: "Contact Us | Silku",
    metaDescription: "Get in touch with Silku customer support for order help, product questions, shipping, returns, and more.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "This Privacy Policy describes how Silku and Shree Khatu Shyam Health Care collect, use, and protect personal information when you visit or make a purchase from our site. We collect information needed to provide services, process orders and payments, communicate with customers, prevent fraud, provide support, and meet legal obligations. For privacy questions or requests, contact silku981@gmail.com.",
    metaTitle: "Privacy Policy | Silku",
    metaDescription: "Read Silku's Privacy Policy to understand how we collect, use, and protect your personal information.",
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    content:
      "These Terms & Conditions govern your use of the Silku website and your purchase of products from us. Product descriptions, availability, pricing, taxes, promotions, and delivery estimates may change where required by law or operational conditions. Orders are subject to acceptance and successful payment or other applicable authorization. Nothing in these terms limits rights that cannot lawfully be excluded.",
    metaTitle: "Terms & Conditions | Silku",
    metaDescription: "Review Silku's Terms & Conditions covering website use, purchases, pricing, shipping, returns, and related policies.",
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    content:
      "Silku currently ships within India only, subject to PIN code and courier coverage. Orders are generally dispatched within 1–2 business days after successful order processing. Domestic delivery is generally expected within 3–7 business days after dispatch, although actual delivery may vary by PIN code and courier network. Orders of ₹500 or more qualify for free shipping. Once an order ships, you'll receive tracking information by email or through the applicable order communication channel.",
    metaTitle: "Shipping Policy | Silku",
    metaDescription: "Learn about Silku's India-only shipping, 1–2 business day dispatch, 3–7 business day delivery, and free shipping on orders of ₹500 or more.",
  },
  {
    slug: "return-refund-policy",
    title: "Return & Refund Policy",
    content:
      "Silku accepts returns of eligible unused and unopened products when a return is requested within 7 days of delivery, subject to applicable return conditions. Opened or used beauty and cosmetic products are not eligible for return for hygiene and product-safety reasons. To start an eligible return, contact silku981@gmail.com with your order number. Approved refunds are normally issued to the original payment method; processing time may depend on the payment provider or bank.",
    metaTitle: "Return & Refund Policy | Silku",
    metaDescription: "Read Silku's return and refund policy for eligible unused and unopened products, including the 7-day return window.",
  },
];
