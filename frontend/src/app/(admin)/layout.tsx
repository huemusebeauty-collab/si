import type { ReactNode } from "react";
import { AdminAuthProvider } from "@/admin/lib/admin-auth-context";

// Sprint 6B — root layout for the entire (admin) route group. Does NOT
// import StorefrontLayout (Header/Footer/AnnouncementBar) — the admin
// console is a distinct application shell (AdminShell, rendered per-page
// after auth is confirmed), not a themed variant of the storefront.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
