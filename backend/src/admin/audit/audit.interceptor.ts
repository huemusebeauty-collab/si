import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AUDIT_KEY, type AuditMetadata } from "./audit.decorator";
import { AuditLogService } from "./audit-log.service";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

// Sprint 6 §15 — records an audit entry AFTER a successful @Audit()'d
// mutation. Deliberately fires only on success (tap's `next`, not
// `error`) — a failed request shouldn't be logged as if the change
// happened, though the request itself is still visible in the regular
// HTTP access log (Sprint 3's RequestLoggingInterceptor) either way.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    return next.handle().pipe(
      tap((responseBody) => {
        void this.auditLog.record({
          actorId: user?.id ?? "system",
          actorEmail: user?.email ?? "system",
          module: metadata.module,
          action: metadata.action,
          entityId: this.extractEntityId(request, responseBody),
          after: responseBody,
        });
      }),
    );
  }

  private extractEntityId(request: Request, responseBody: unknown): string | undefined {
    const paramId = Object.values(request.params ?? {})[0];
    if (typeof paramId === "string") return paramId;
    if (responseBody && typeof responseBody === "object" && "id" in responseBody) {
      return String((responseBody as { id: unknown }).id);
    }
    return undefined;
  }
}
