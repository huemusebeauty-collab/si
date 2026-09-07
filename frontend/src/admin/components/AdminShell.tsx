"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminAuth } from "@/admin/lib/admin-auth-context";
import { ROLE_LABELS, type AdminModule } from "@/admin/lib/permissions";
import { RoleGate } from "./RoleGate";
import { Avatar } from "@/components/basic/Avatar";
import { Button } from "@/components/basic/Button";
import { Icon } from "@/components/basic/Icon";

// Sprint 6B — reuses Sprint 2's design system (Avatar, Button, Icon,
// design tokens) rather than introducing new admin-specific visual
// primitives, per the sprint's "reuse the design system established in
// Sprint 2" constraint. Layout itself (sidebar + topbar) is new — no
// Sprint 2 layout matched an admin console's needs — but every
// individual control is a Sprint 2 component.
const NAV_ITEMS: { href: string; label: string; module: AdminModule }[] = [
  { href: "/admin/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/admin/products", label: "Products", module: "products" },
  { href: "/admin/categories", label: "Categories", module: "categories" },
  { href: "/admin/collections", label: "Collections", module: "categories" },
  { href: "/admin/orders", label: "Orders", module: "orders" },
  { href: "/admin/customers", label: "Customers", module: "customers" },
  { href: "/admin/reviews", label: "Reviews", module: "reviews" },
  { href: "/admin/coupons", label: "Coupons", module: "coupons" },
  { href: "/admin/cms/pages", label: "CMS", module: "content" },
  { href: "/admin/media", label: "Media Library", module: "content" },
  { href: "/admin/reports", label: "Reports", module: "reports" },
  { href: "/admin/audit-logs", label: "Audit Log", module: "dashboard" },
  { href: "/admin/import-export", label: "Import/Export", module: "products" },
  { href: "/admin/system/queues", label: "Queue Monitor", module: "settings" },
  { href: "/admin/system/integrations", label: "Integration Status", module: "settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, email, logout } = useAdminAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#admin-main-content" className="skip-link">Skip to content</a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-fog bg-white sm:flex" aria-label="Admin navigation">
        <div className="border-b border-fog p-4">
          <Link href="/admin/dashboard" className="font-display text-[20px] font-semibold text-primary-plum">
            Hue Muse Admin
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <RoleGate key={item.href} module={item.module} level="view">
                <li>
                  <Link
                    href={item.href}
                    aria-current={pathname?.startsWith(item.href) ? "page" : undefined}
                    className={`block rounded-sm px-3 py-2 text-[15px] ${
                      pathname?.startsWith(item.href)
                        ? "bg-secondary-blush font-semibold text-primary-plum"
                        : "text-charcoal hover:bg-paper"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              </RoleGate>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-fog bg-white px-4 py-3 sm:px-6">
          <span className="font-semibold text-ink sm:hidden">Hue Muse Admin</span>
          <span className="hidden text-[13px] text-stone sm:block" aria-live="polite">
            Signed in as {email} — {role ? ROLE_LABELS[role] : ""}
          </span>
          <div className="flex items-center gap-3">
            <Avatar alt={email ?? "Admin"} size={32} />
            <Button variant="text" onClick={logout}>
              <Icon size={16} label="">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </Icon>
              Log Out
            </Button>
          </div>
        </header>

        <main id="admin-main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
