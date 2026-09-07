import { AdminRole, hasPermission } from "../admin-role";

// Sprint 6 — Business Rule Tests: the Phase 6 §12 permission matrix,
// spot-checked against specific documented cells rather than every
// cell (35 module x role combinations) — the ones most likely to be
// mistyped during transcription and the ones with real security
// consequences if wrong.
describe("hasPermission (Phase 6 §12 matrix)", () => {
  it("grants Super Admin full access to every module", () => {
    expect(hasPermission(AdminRole.SUPER_ADMIN, "settings", "full")).toBe(true);
    expect(hasPermission(AdminRole.SUPER_ADMIN, "userRoles", "full")).toBe(true);
  });

  it("denies Product Manager any access to Orders (module: none)", () => {
    expect(hasPermission(AdminRole.PRODUCT_MANAGER, "orders", "view")).toBe(false);
  });

  it("denies Customer Support any access to Categories (module: none)", () => {
    expect(hasPermission(AdminRole.CUSTOMER_SUPPORT, "categories", "view")).toBe(false);
  });

  it("grants Customer Support 'edit' but not 'full' on Orders", () => {
    expect(hasPermission(AdminRole.CUSTOMER_SUPPORT, "orders", "edit")).toBe(true);
    expect(hasPermission(AdminRole.CUSTOMER_SUPPORT, "orders", "full")).toBe(false);
  });

  it("grants Store Manager 'edit' but not 'full' on Products", () => {
    expect(hasPermission(AdminRole.STORE_MANAGER, "products", "edit")).toBe(true);
    expect(hasPermission(AdminRole.STORE_MANAGER, "products", "full")).toBe(false);
  });

  it("grants Content Manager 'full' on Content but only 'view' on Dashboard", () => {
    expect(hasPermission(AdminRole.CONTENT_MANAGER, "content", "full")).toBe(true);
    expect(hasPermission(AdminRole.CONTENT_MANAGER, "dashboard", "edit")).toBe(false);
    expect(hasPermission(AdminRole.CONTENT_MANAGER, "dashboard", "view")).toBe(true);
  });

  it("denies every non-Super-Admin role access to Settings", () => {
    expect(hasPermission(AdminRole.STORE_MANAGER, "settings", "view")).toBe(false);
    expect(hasPermission(AdminRole.PRODUCT_MANAGER, "settings", "view")).toBe(false);
    expect(hasPermission(AdminRole.CONTENT_MANAGER, "settings", "view")).toBe(false);
    expect(hasPermission(AdminRole.CUSTOMER_SUPPORT, "settings", "view")).toBe(false);
  });

  it("denies every non-Super-Admin role access to User Roles management", () => {
    for (const role of [AdminRole.STORE_MANAGER, AdminRole.PRODUCT_MANAGER, AdminRole.CONTENT_MANAGER, AdminRole.CUSTOMER_SUPPORT]) {
      expect(hasPermission(role, "userRoles", "view")).toBe(false);
    }
  });

  it("treats 'full' as satisfying a lower-level requirement (level hierarchy)", () => {
    expect(hasPermission(AdminRole.SUPER_ADMIN, "products", "view")).toBe(true);
    expect(hasPermission(AdminRole.SUPER_ADMIN, "products", "edit")).toBe(true);
  });
});
