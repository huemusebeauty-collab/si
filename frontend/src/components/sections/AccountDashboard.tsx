"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/basic/Avatar";
import { ROUTES } from "@/constants/routes";
import { authenticatedFetch, logoutSession } from "@/services/api/auth";

type CustomerProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export function AccountDashboard() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authenticatedFetch("/customers/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load account.");
        const body = (await response.json()) as { data?: CustomerProfile } & CustomerProfile;
        return body.data ?? body;
      })
      .then((profile) => {
        if (active) setCustomer(profile);
      })
      .catch(() => {
        if (active) setCustomer(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim()
    : "";
  const displayName = customerName || "My Account";
  const firstName = customer?.firstName || "there";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutSession();
    } finally {
      router.replace("/account/login");
    }
  }

  const links = [
    { label: "Order Tracking", href: ROUTES.accountOrders },
    { label: "Wishlist", href: ROUTES.wishlist },
    { label: "Account Settings", href: "/account/settings" },
    { label: "Addresses", href: "/account/addresses" },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <aside className="flex flex-col items-center gap-3 rounded-md bg-white p-6 shadow-rest sm:items-start">
        <Avatar alt={displayName} />
        <p className="font-semibold text-ink">{loading ? "Loading…" : displayName}</p>
        <nav aria-label="Account" className="mt-2 flex w-full flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm px-2 py-2 text-base text-charcoal hover:bg-paper">
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="rounded-sm px-2 py-2 text-left text-base text-charcoal hover:bg-paper disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>
      </aside>
      <div className="sm:col-span-2">
        <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">
          {loading ? "Loading your account…" : `Welcome back, ${firstName}`}
        </h2>
        <p className="mt-2 text-base text-stone">Your recent orders and saved items appear here.</p>
      </div>
    </div>
  );
}
