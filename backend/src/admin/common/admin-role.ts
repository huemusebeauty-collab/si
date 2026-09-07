// Sprint 6 — Role-based administration, per the frozen Phase 6 §12 role matrix.
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  STORE_MANAGER = "store_manager",
  PRODUCT_MANAGER = "product_manager",
  CONTENT_MANAGER = "content_manager",
  CUSTOMER_SUPPORT = "customer_support",
}

export type PermissionLevel = "full" | "edit" | "view" | "none";
export type AdminModule =
  | "dashboard" | "products" | "categories" | "orders" | "customers"
  | "reviews" | "coupons" | "content" | "settings" | "reports" | "userRoles" | "billing";

export const PERMISSION_MATRIX: Record<AdminModule, Record<AdminRole, PermissionLevel>> = {
  dashboard: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "full", [AdminRole.PRODUCT_MANAGER]: "view", [AdminRole.CONTENT_MANAGER]: "view", [AdminRole.CUSTOMER_SUPPORT]: "view" },
  products: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "edit", [AdminRole.PRODUCT_MANAGER]: "full", [AdminRole.CONTENT_MANAGER]: "view", [AdminRole.CUSTOMER_SUPPORT]: "view" },
  categories: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "edit", [AdminRole.PRODUCT_MANAGER]: "full", [AdminRole.CONTENT_MANAGER]: "view", [AdminRole.CUSTOMER_SUPPORT]: "none" },
  orders: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "full", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "edit" },
  customers: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "view", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "edit" },
  reviews: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "edit", [AdminRole.PRODUCT_MANAGER]: "view", [AdminRole.CONTENT_MANAGER]: "edit", [AdminRole.CUSTOMER_SUPPORT]: "edit" },
  coupons: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "full", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "none" },
  content: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "view", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "full", [AdminRole.CUSTOMER_SUPPORT]: "view" },
  settings: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "none", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "none" },
  reports: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "full", [AdminRole.PRODUCT_MANAGER]: "view", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "none" },
  userRoles: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "none", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "none" },
  billing: { [AdminRole.SUPER_ADMIN]: "full", [AdminRole.STORE_MANAGER]: "full", [AdminRole.PRODUCT_MANAGER]: "none", [AdminRole.CONTENT_MANAGER]: "none", [AdminRole.CUSTOMER_SUPPORT]: "view" },
};

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };
export function hasPermission(role: AdminRole, adminModule: AdminModule, required: PermissionLevel): boolean {
  return LEVEL_RANK[PERMISSION_MATRIX[adminModule][role]] >= LEVEL_RANK[required];
}
