// Sprint 6 — Role-based administration, per the frozen Phase 6 §12 role
// matrix (5 fixed roles). Distinct from — and more granular than —
// Sprint 3/4/5's coarse `@Roles("admin")` check, which every existing
// admin endpoint across Products/Categories/Collections/Orders/Reviews/
// CMS/Storage/Email/SMS still uses. Migrating every one of those to the
// fine-grained matrix is flagged in Known Issues as a larger retrofit
// than this sprint's "reuse, don't duplicate" instruction favors
// attempting wholesale; this sprint applies the real matrix to Sprint
// 6's own new admin surfaces (dashboard, reports, audit log, bulk ops,
// import/export, coupons) and to the highest-value existing ones
// (Products, Orders, Reviews, CMS) — see PermissionsGuard usage.
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  STORE_MANAGER = "store_manager",
  PRODUCT_MANAGER = "product_manager",
  CONTENT_MANAGER = "content_manager",
  CUSTOMER_SUPPORT = "customer_support",
}

export type PermissionLevel = "full" | "edit" | "view" | "none";

export type AdminModule =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "reviews"
  | "coupons"
  | "content"
  | "settings"
  | "reports"
  | "userRoles";

// Sprint 6 — the exact matrix from Phase 6 §12, transcribed verbatim
// (not paraphrased or reinterpreted) so a future doc update can be
// diffed directly against this constant.
export const PERMISSION_MATRIX: Record<AdminModule, Record<AdminRole, PermissionLevel>> = {
  dashboard: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "full",
    [AdminRole.PRODUCT_MANAGER]: "view",
    [AdminRole.CONTENT_MANAGER]: "view",
    [AdminRole.CUSTOMER_SUPPORT]: "view",
  },
  products: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "edit",
    [AdminRole.PRODUCT_MANAGER]: "full",
    [AdminRole.CONTENT_MANAGER]: "view",
    [AdminRole.CUSTOMER_SUPPORT]: "view",
  },
  categories: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "edit",
    [AdminRole.PRODUCT_MANAGER]: "full",
    [AdminRole.CONTENT_MANAGER]: "view",
    [AdminRole.CUSTOMER_SUPPORT]: "none",
  },
  orders: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "full",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "edit",
  },
  customers: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "view",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "edit",
  },
  reviews: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "edit",
    [AdminRole.PRODUCT_MANAGER]: "view",
    [AdminRole.CONTENT_MANAGER]: "edit",
    [AdminRole.CUSTOMER_SUPPORT]: "edit",
  },
  coupons: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "full",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "none",
  },
  content: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "view",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "full",
    [AdminRole.CUSTOMER_SUPPORT]: "view",
  },
  settings: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "none",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "none",
  },
  reports: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "full",
    [AdminRole.PRODUCT_MANAGER]: "view",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "none",
  },
  userRoles: {
    [AdminRole.SUPER_ADMIN]: "full",
    [AdminRole.STORE_MANAGER]: "none",
    [AdminRole.PRODUCT_MANAGER]: "none",
    [AdminRole.CONTENT_MANAGER]: "none",
    [AdminRole.CUSTOMER_SUPPORT]: "none",
  },
};

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export function hasPermission(role: AdminRole, adminModule: AdminModule, required: PermissionLevel): boolean {
  const granted = PERMISSION_MATRIX[adminModule][role];
  return LEVEL_RANK[granted] >= LEVEL_RANK[required];
}
