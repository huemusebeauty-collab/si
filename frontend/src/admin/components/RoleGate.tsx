"use client";
import type { ReactNode } from "react";
import { useAdminAuth } from "@/admin/lib/admin-auth-context";
import { hasPermission, type AdminModule, type PermissionLevel } from "@/admin/lib/permissions";

// Sprint 6B — UI-visibility RBAC enforcement (per the sprint's own
// constraint, this is one half of "both UI visibility and backend
// authorization" — see permissions.ts for the important caveat that
// this never substitutes for server-side enforcement).
export function RoleGate({
  module: adminModule,
  level,
  children,
  fallback = null,
}: {
  module: AdminModule;
  level: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role } = useAdminAuth();
  if (!hasPermission(role ?? undefined, adminModule, level)) return <>{fallback}</>;
  return <>{children}</>;
}
