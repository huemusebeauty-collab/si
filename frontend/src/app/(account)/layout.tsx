import type { ReactNode } from "react";
import { StorefrontLayout } from "@/layouts/StorefrontLayout";

// Account routes share the storefront chrome (Header/Footer) per Phase 8
// §1 — same component/design system across storefront and account.
export default function Layout({ children }: { children: ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
