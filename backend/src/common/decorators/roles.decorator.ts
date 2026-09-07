import { SetMetadata } from "@nestjs/common";

// Sprint 3.3/3.7 — Phase 16 §16.13/§16.14: role-based access enforced
// server-side, checked at the controller layer before any service
// method executes.
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
