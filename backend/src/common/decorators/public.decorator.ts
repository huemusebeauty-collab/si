import { SetMetadata } from "@nestjs/common";

// Sprint 3.3/3.7 — marks an endpoint as not requiring authentication
// (e.g. guest browsing of products/categories). Checked by JwtAuthGuard.
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
