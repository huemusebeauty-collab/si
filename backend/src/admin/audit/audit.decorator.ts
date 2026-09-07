import { SetMetadata } from "@nestjs/common";

export const AUDIT_KEY = "auditMetadata";
export interface AuditMetadata {
  module: string;
  action: string;
}

// Sprint 6 — marks a controller method for automatic audit logging
// (AuditInterceptor). Applied to Sprint 6's own new mutation endpoints;
// retrofitting it onto every Sprint 3-5 admin mutation is flagged in
// Known Issues as a larger change than this sprint attempts wholesale
// (same reasoning as the RolesGuard/PermissionsGuard split).
export const Audit = (module: string, action: string) => SetMetadata(AUDIT_KEY, { module, action } as AuditMetadata);
