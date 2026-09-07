import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { AccountDashboard } from "@/components/sections/AccountDashboard";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false }, // account pages are never indexed
};

export default function AccountPage() {
  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">My Account</h1>
      <div className="mt-6">
        <AccountDashboard customerName="Jordan Rivera" />
      </div>
    </div>
  );
}
