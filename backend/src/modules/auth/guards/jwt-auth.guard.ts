import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";

// Sprint 3.3/3.7 — global-by-default guard (registered as APP_GUARD in
// app.module.ts): every endpoint requires a valid JWT unless explicitly
// marked @Public() — the safe default per Phase 8 §6/§7 (never opt-in
// to auth, opt-out).
//
// Sprint 4.15 correction: @Public() previously skipped authentication
// entirely, meaning even a request WITH a valid Bearer token got no
// `req.user` on a public route — which is what let
// OrdersController.create (Sprint 4.6, @Public() for guest checkout)
// accept an arbitrary `customerId` in the request body with no way to
// cross-check it against the caller's real identity when they WERE
// logged in (see KI4-6/R4-2 in SPRINT_4_CLOSURE_REPORT.md). Fixed here:
// @Public() now attempts optional authentication — if a valid token is
// present, `req.user` is populated as normal; if absent or invalid, the
// request still proceeds (true guest access), it just has no `req.user`.
// Controllers can then reject a mismatched customerId when `req.user`
// IS present — see OrdersController.create's new check.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest<Request>();
      const hasAuthHeader = Boolean(request.headers.authorization);
      if (!hasAuthHeader) return true; // true guest request — no token to check
      // A token WAS supplied on a public route — validate it and attach
      // req.user if valid; do NOT reject the request if it's invalid,
      // since the route is still meant to be reachable without auth.
      return super.canActivate(context) as Promise<boolean>;
    }
    return super.canActivate(context);
  }

  handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Sprint 4.15 — on a public route, never throw for a missing/bad
      // token; just return whatever user Passport resolved (possibly
      // undefined). Non-public routes keep the default AuthGuard
      // behavior (throws UnauthorizedException on failure).
      return user ?? undefined;
    }
    return super.handleRequest(err, user, info, context);
  }
}
