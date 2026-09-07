import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../roles.guard";
import { AdminRole } from "@/admin/common/admin-role";

// Sprint 6 — Business Rule Test for the most consequential bug this
// sprint found: `@Roles("admin")` was unsatisfiable by any real login
// across Sprints 3-5, since no auth flow ever issued role: "admin".
// This test locks in the fix — a real AdminRole value now satisfies a
// `@Roles("admin")` check, and a customer-realm role still does not.
function createContext(userRole: string | undefined): ExecutionContext {
  const request = { user: userRole ? { id: "u1", email: "u1@test.com", role: userRole } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard — admin role compatibility fix", () => {
  function createGuard(requiredRoles: string[] | undefined) {
    const reflector = { getAllAndOverride: () => requiredRoles } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it("allows a Super Admin through a @Roles('admin') check", () => {
    const guard = createGuard(["admin"]);
    expect(guard.canActivate(createContext(AdminRole.SUPER_ADMIN))).toBe(true);
  });

  it("allows a Product Manager through a @Roles('admin') check", () => {
    const guard = createGuard(["admin"]);
    expect(guard.canActivate(createContext(AdminRole.PRODUCT_MANAGER))).toBe(true);
  });

  it("rejects a customer-realm role against a @Roles('admin') check", () => {
    const guard = createGuard(["admin"]);
    expect(() => guard.canActivate(createContext("customer"))).toThrow(ForbiddenException);
  });

  it("rejects an unauthenticated request against a @Roles('admin') check", () => {
    const guard = createGuard(["admin"]);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });

  it("still supports an exact non-admin role match unrelated to this fix", () => {
    const guard = createGuard(["moderator"]);
    expect(guard.canActivate(createContext("moderator"))).toBe(true);
    expect(() => guard.canActivate(createContext("customer"))).toThrow(ForbiddenException);
  });
});
