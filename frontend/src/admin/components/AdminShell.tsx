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

type NavIcon = "dashboard" | "products" | "inventory" | "categories" | "collections" | "orders" | "billing" | "logistics" | "customers" | "reviews" | "coupons" | "cms" | "media" | "reports" | "audit" | "import" | "queue" | "integration";

const NAV_ITEMS: { href: string; label: string; module: AdminModule; icon: NavIcon }[] = [
  { href: "/admin/dashboard", label: "Dashboard", module: "dashboard", icon: "dashboard" },
  { href: "/admin/products", label: "Products", module: "products", icon: "products" },
  { href: "/admin/inventory", label: "Inventory", module: "products", icon: "inventory" },
  { href: "/admin/categories", label: "Categories", module: "categories", icon: "categories" },
  { href: "/admin/collections", label: "Collections", module: "categories", icon: "collections" },
  { href: "/admin/orders", label: "Orders", module: "orders", icon: "orders" },
  { href: "/admin/billing", label: "Billing", module: "billing", icon: "billing" },
  { href: "/admin/logistics", label: "Logistics", module: "logistics", icon: "logistics" },
  { href: "/admin/customers", label: "Customers", module: "customers", icon: "customers" },
  { href: "/admin/reviews", label: "Reviews", module: "reviews", icon: "reviews" },
  { href: "/admin/coupons", label: "Coupons", module: "coupons", icon: "coupons" },
  { href: "/admin/cms/pages", label: "CMS", module: "content", icon: "cms" },
  { href: "/admin/media", label: "Media Library", module: "content", icon: "media" },
  { href: "/admin/reports", label: "Reports", module: "reports", icon: "reports" },
  { href: "/admin/audit-logs", label: "Audit Log", module: "dashboard", icon: "audit" },
  { href: "/admin/import-export", label: "Import/Export", module: "products", icon: "import" },
  { href: "/admin/system/queues", label: "Queue Monitor", module: "settings", icon: "queue" },
  { href: "/admin/system/integrations", label: "Integration Status", module: "settings", icon: "integration" },
];

function NavIcon({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, ReactNode> = {
    dashboard: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 8h6V4h-6z" />,
    products: <><path d="M4 7h16M6 7v13h12V7M8 7l1-3h6l1 3" /></>,
    inventory: <><path d="M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10" /></>,
    categories: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="1.5" /><circle cx="16" cy="12" r="1.5" /></>,
    collections: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    orders: <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" />,
    billing: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h3M15 13h1" /></>,
    logistics: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    customers: <><circle cx="12" cy="8" r="3" /><path d="M5 21c.8-4 3-6 7-6s6.2 2 7 6" /></>,
    reviews: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    coupons: <><path d="M4 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h16v-4a2 2 0 0 0 0-4V7z" /><path d="M13 9l-4 6" /></>,
    cms: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
    media: <><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="M5 17l4-4 3 3 2-2 5 5" /></>,
    reports: <path d="M5 20V10M12 20V4M19 20v-7" />,
    audit: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
    import: <><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></>,
    queue: <><rect x="4" y="5" width="16" height="4" rx="1" /><rect x="4" y="10" width="16" height="4" rx="1" /><rect x="4" y="15" width="16" height="4" rx="1" /></>,
    integration: <><circle cx="7" cy="12" r="3" /><circle cx="17" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><path d="M9.5 10.5l5-2M9.5 13.5l5 2" /></>,
  };
  return <Icon size={20} label="">{paths[icon]}</Icon>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, email, logout } = useAdminAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#admin-main-content" className="skip-link">Skip to content</a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-fog bg-white sm:flex" aria-label="Admin navigation">
        <div className="border-b border-fog p-4">
          <Link href="/admin/dashboard" className="font-display text-[20px] font-semibold text-primary-plum">Silku Admin</Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <RoleGate key={item.href} module={item.module} level="view">
                <li><Link href={item.href} aria-current={pathname?.startsWith(item.href) ? "page" : undefined} className={`flex items-center gap-3 rounded-sm px-3 py-2 text-[15px] ${pathname?.startsWith(item.href) ? "bg-secondary-blush font-semibold text-primary-plum" : "text-charcoal hover:bg-paper"}`}><NavIcon icon={item.icon} /><span>{item.label}</span></Link></li>
              </RoleGate>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-fog bg-white px-4 py-3 sm:px-6">
          <span className="font-semibold text-ink sm:hidden">Silku Admin</span>
          <span className="hidden text-[13px] text-stone sm:block" aria-live="polite">Signed in as {email} — {role ? ROLE_LABELS[role] : ""}</span>
          <div className="flex items-center gap-3">
            <Avatar alt={email ?? "Admin"} size={32} />
            <Button variant="text" onClick={logout}>
              <Icon size={16} label=""><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></Icon>
              Log Out
            </Button>
          </div>
        </header>
        <main id="admin-main-content" className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
