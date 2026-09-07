import { describe, expect, it } from "vitest";
import { hasPermission } from "../permissions";

// Sprint 6B — Component/Unit Tests: the frontend's mirrored permission
// matrix, spot-checked against the same cells the backend's equivalent
// test (admin-role.spec.ts) checks, so a future drift between the two
// copies is more likely to be caught (see permissions.ts's own caveat
// about the duplication risk).
describe("frontend hasPermission (mirrors backend Phase 6 §12 matrix)", () => {
  it("grants Super Admin full access to Settings", () => {
    expect(hasPermission("super_admin", "settings", "full")).toBe(true);
  });

  it("denies Product Manager any access to Orders", () => {
    expect(hasPermission("product_manager", "orders", "view")).toBe(false);
  });

  it("denies Customer Support any access to Categories", () => {
    expect(hasPermission("customer_support", "categories", "view")).toBe(false);
  });

  it("returns false when role is undefined (logged out)", () => {
    expect(hasPermission(undefined, "dashboard", "view")).toBe(false);
  });

  it("treats 'full' as satisfying a lower-level requirement", () => {
    expect(hasPermission("super_admin", "products", "view")).toBe(true);
  });
});
