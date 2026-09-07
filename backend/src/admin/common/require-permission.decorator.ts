import { SetMetadata } from "@nestjs/common";
import type { AdminModule, PermissionLevel } from "./admin-role";

export const PERMISSION_KEY = "requiredPermission";
export interface RequiredPermission {
  module: AdminModule;
  level: PermissionLevel;
}

// Sprint 6 — fine-grained permission check against the real Phase 6 §12
// matrix, distinct from Sprint 3's coarse @Roles() decorator.
export const RequirePermission = (adminModule: AdminModule, level: PermissionLevel) =>
  SetMetadata(PERMISSION_KEY, { module: adminModule, level } as RequiredPermission);
