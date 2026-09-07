// Route path constants (Phase 1 §1 sitemap). Central source so no page
// hardcodes a path string inline.
export const ROUTES = {
  home: "/",
  shop: "/shop",
  category: (slug: string) => `/shop/${slug}`,
  collection: (slug: string) => `/collections/${slug}`,
  product: (slug: string) => `/products/${slug}`,
  search: "/search",
  wishlist: "/account/wishlist",
  cart: "/cart",
  account: "/account",
  accountOrders: "/account/orders",
  staticPage: (slug: string) => `/pages/${slug}`,
} as const;
