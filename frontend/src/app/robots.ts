import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

// Sprint 2.9 — SEO & AI Search Readiness. Account/cart/search routes
// excluded from crawling; storefront/product/collection routes open.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/cart", "/search"],
    },
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
