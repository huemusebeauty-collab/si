import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PERMISSION_KEY, type RequiredPermission } from "./require-permission.decorator";
import { hasPermission, type AdminRole } from "./admin-role";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

// Sprint 6 — enforces @RequirePermission() against the real role
// matrix. Runs alongside (not instead of) JwtAuthGuard — this guard
// only checks permission LEVEL once identity is already established;
// it does not itself authenticate.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // endpoint doesn't declare a permission requirement — not this guard's concern

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("Authentication is required for this action.");
    }

    // Sprint 6 — a customer-realm JWT (role: "customer") never satisfies
    // any admin permission check, regardless of level — the AdminRole
    // enum and the "customer" role are deliberately disjoint string
    // spaces so a customer token can never accidentally pass an
    // `AdminRole` cast here.
    const role = user.role as AdminRole;
    if (!hasPermission(role, required.module, required.level)) {
      throw new ForbiddenException(
        `Your role does not have "${required.level}" access to "${required.module}".`,
      );
    }
    return true;
  }
}
