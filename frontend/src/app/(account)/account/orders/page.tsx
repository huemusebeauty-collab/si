import type { Metadata } from "next";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { OrderTrackingTimeline } from "@/components/sections/OrderTrackingTimeline";

export const metadata: Metadata = {
  title: "Order Tracking",
  robots: { index: false },
};

const MOCK_ORDER_STEPS = [
  { label: "Order Placed", complete: true },
  { label: "Processing", complete: true },
  { label: "Shipped", complete: false },
  { label: "Delivered", complete: false },
];

export default function OrdersPage() {
  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Orders" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Order Tracking</h1>
      <div className="mt-8 rounded-md bg-white p-6 shadow-rest">
        <p className="mb-6 font-semibold text-ink">Order #HMB-10234</p>
        <OrderTrackingTimeline steps={MOCK_ORDER_STEPS} />
      </div>
    </div>
  );
}
