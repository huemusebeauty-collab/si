"use client";

import { useEffect, useState } from "react";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { authenticatedFetch } from "@/services/api/auth";

type CustomerProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export default function AccountSettingsPage() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authenticatedFetch("/customers/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load account.");
        const body = (await response.json()) as { data?: CustomerProfile } & CustomerProfile;
        return body.data ?? body;
      })
      .then(setCustomer)
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, []);

  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Settings" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Account Settings</h1>
      <div className="mt-8 max-w-2xl rounded-md bg-white p-6 shadow-rest">
        <p className="text-base text-stone">Manage your Silku account details and preferences here.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-fog p-4"><p className="text-sm text-stone">Name</p><p className="mt-1 font-semibold text-ink">{loading ? "Loading…" : name || "Not available"}</p></div>
          <div className="rounded-md border border-fog p-4"><p className="text-sm text-stone">Email</p><p className="mt-1 font-semibold text-ink">{loading ? "Loading…" : customer?.email || "Not available"}</p></div>
        </div>
      </div>
    </div>
  );
}
