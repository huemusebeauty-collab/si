# State

Reserved for cross-page state containers (e.g. `CartContext`,
`WishlistContext`) per Phase 14 §14.2/§14.9. Sprint 2 keeps cart/wishlist
state local to each page (see `app/(storefront)/cart/page.tsx`) since no
page-to-page persistence requirement exists yet without a backend to
persist against. Promote to a real context/store here the moment two
pages need to share the same cart state.
