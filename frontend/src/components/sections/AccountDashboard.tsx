import Link from "next/link";
import { Avatar } from "@/components/basic/Avatar";
import { ROUTES } from "@/constants/routes";

// Account Dashboard — Phase 4 §17 Page Section. Sprint 2 scope: shell +
// navigation against mock data; real order/address data is a Sprint 3+
// concern.
export function AccountDashboard({ customerName }: { customerName: string }) {
  const links = [
    { label: "Order Tracking", href: ROUTES.accountOrders },
    { label: "Wishlist", href: ROUTES.wishlist },
    { label: "Account Settings", href: "/account/settings" },
    { label: "Addresses", href: "/account/addresses" },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <aside className="flex flex-col items-center gap-3 rounded-md bg-white p-6 shadow-rest sm:items-start">
        <Avatar alt={customerName} />
        <p className="font-semibold text-ink">{customerName}</p>
        <nav aria-label="Account" className="mt-2 flex w-full flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm px-2 py-2 text-base text-charcoal hover:bg-paper">
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="sm:col-span-2">
        <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">Welcome back, {customerName.split(" ")[0]}</h2>
        <p className="mt-2 text-base text-stone">Your recent orders and saved items appear here.</p>
      </div>
    </div>
  );
}
