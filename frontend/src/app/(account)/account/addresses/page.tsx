import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";

export const metadata: Metadata = {
  title: "Addresses | Silku",
  robots: { index: false },
};

export default function AddressesPage() {
  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Addresses" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Saved Addresses</h1>
      <div className="mt-8 max-w-2xl rounded-md border border-fog bg-white p-8 text-stone">
        No saved addresses yet. Your saved delivery addresses will appear here.
      </div>
    </div>
  );
}
