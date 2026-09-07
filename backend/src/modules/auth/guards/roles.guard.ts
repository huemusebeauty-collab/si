import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { AdminRole } from "@/admin/common/admin-role";

// Sprint 3.3/3.7 — Phase 16 §16.14: role-based access "checked against
// the Phase 6 §12 matrix at the controller layer, before any service
// method executes." The concrete role matrix is a Phase 6/admin-panel
// concern (Sprint 3 OUT OF SCOPE listed no admin panel) — this guard
// enforces whatever roles a controller declares via @Roles(...).
//
// Sprint 6 correction: every `@Roles("admin")` usage across Sprints
// 3-5 (Products/Categories/Collections/Orders/Reviews/CMS/Storage/
// Email/SMS) checked for the literal string "admin" — but no auth flow
// has ever issued a JWT with that role (customer login always issues
// "customer"; admin login, added this sprint, issues one of the real
// AdminRole values like "super_admin"). That made every one of those
// guards unsatisfiable by any real login since the day they were
// written. Fixed here, not by touching 15+ existing controllers: the
// literal role "admin" is now treated as shorthand for "any real admin
// role," so existing `@Roles("admin")` decorators start working
// correctly the moment an admin user (this sprint) logs in, with zero
// changes to those controllers. New Sprint 6 endpoints use the
// fine-grained `@RequirePermission()` (PermissionsGuard) instead, which
// doesn't have this ambiguity.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    const expandedRoles = requiredRoles.flatMap((r) =>
      r === "admin" ? (Object.values(AdminRole) as string[]) : [r],
    );

    if (!user || !expandedRoles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }
    return true;
  }
}
