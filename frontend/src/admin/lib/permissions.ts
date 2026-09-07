// Sprint 6B — mirrors backend `src/admin/common/admin-role.ts` exactly
// (Phase 6 §12). This is UI-visibility enforcement only — per the
// sprint's own constraint ("Enforce RBAC through both UI visibility
// AND backend authorization"), the backend's PermissionsGuard remains
// the actual security boundary. A user could bypass a hidden nav item
// via direct URL/API call and would still be correctly rejected by the
// backend — this file only controls what's *shown*, never what's
// *allowed*. Kept as a hand-mirrored constant rather than a shared npm
// package (no monorepo package-sharing infrastructure exists — see
// Known Issues) — a real risk if the two drift, flagged explicitly.
export type AdminRole = "super_admin" | "store_manager" | "product_manager" | "content_manager" | "customer_support";
export type PermissionLevel = "full" | "edit" | "view" | "none";
export type AdminModule =
  | "dashboard" | "products" | "categories" | "orders" | "customers"
  | "reviews" | "coupons" | "content" | "settings" | "reports" | "userRoles";

export const PERMISSION_MATRIX: Record<AdminModule, Record<AdminRole, PermissionLevel>> = {
  dashboard: { super_admin: "full", store_manager: "full", product_manager: "view", content_manager: "view", customer_support: "view" },
  products: { super_admin: "full", store_manager: "edit", product_manager: "full", content_manager: "view", customer_support: "view" },
  categories: { super_admin: "full", store_manager: "edit", product_manager: "full", content_manager: "view", customer_support: "none" },
  orders: { super_admin: "full", store_manager: "full", product_manager: "none", content_manager: "none", customer_support: "edit" },
  customers: { super_admin: "full", store_manager: "view", product_manager: "none", content_manager: "none", customer_support: "edit" },
  reviews: { super_admin: "full", store_manager: "edit", product_manager: "view", content_manager: "edit", customer_support: "edit" },
  coupons: { super_admin: "full", store_manager: "full", product_manager: "none", content_manager: "none", customer_support: "none" },
  content: { super_admin: "full", store_manager: "view", product_manager: "none", content_manager: "full", customer_support: "view" },
  settings: { super_admin: "full", store_manager: "none", product_manager: "none", content_manager: "none", customer_support: "none" },
  reports: { super_admin: "full", store_manager: "full", product_manager: "view", content_manager: "none", customer_support: "none" },
  userRoles: { super_admin: "full", store_manager: "none", product_manager: "none", content_manager: "none", customer_support: "none" },
};

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export function hasPermission(role: AdminRole | undefined, adminModule: AdminModule, required: PermissionLevel): boolean {
  if (!role) return false;
  return LEVEL_RANK[PERMISSION_MATRIX[adminModule][role]] >= LEVEL_RANK[required];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  store_manager: "Store Manager",
  product_manager: "Product Manager",
  content_manager: "Content Manager",
  customer_support: "Customer Support",
};
