import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";

export const metadata: Metadata = {
  title: "Account Settings | Silku",
  robots: { index: false },
};

export default function AccountSettingsPage() {
  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Settings" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Account Settings</h1>
      <div className="mt-8 max-w-2xl rounded-md bg-white p-6 shadow-rest">
        <p className="text-base text-stone">Manage your Silku account details and preferences here.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-fog p-4"><p className="text-sm text-stone">Name</p><p className="mt-1 font-semibold text-ink">Jordan Rivera</p></div>
          <div className="rounded-md border border-fog p-4"><p className="text-sm text-stone">Email</p><p className="mt-1 font-semibold text-ink">Your account email</p></div>
        </div>
      </div>
    </div>
  );
}
