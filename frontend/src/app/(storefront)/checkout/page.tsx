"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { Button } from "@/components/basic/Button";
import { formatCurrency } from "@/utils/formatCurrency";
import { createOrder, getCartTotals, getOrCreateGuestCart, type ApiCart } from "@/services/api/cart";
import { trackWebsiteEvent } from "@/components/WebsiteEventTracker";

export default function CheckoutPage() {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  useEffect(() => {
    async function load() {
      try {
        const [nextCart, nextTotals] = await Promise.all([getOrCreateGuestCart(), getCartTotals()]);
        setCart(nextCart);
        setTotals(nextTotals);
        if (nextCart.lineItems.some((item) => !item.savedForLater)) {
          trackWebsiteEvent("begin_checkout", { metadata: { itemCount: nextTotals.itemCount } });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load checkout.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder(form);
      setOrderId(order.id);
      trackWebsiteEvent("purchase", { orderId: order.id, metadata: { total: totals.total, itemCount: totals.itemCount } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place your order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-10 text-stone">Loading checkout…</div>;

  if (orderId) {
    return (
      <div className="py-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Checkout" }]} />
        <div className="mx-auto mt-10 max-w-xl rounded-md bg-white p-8 text-center shadow-rest">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone">Silku</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink">Order received</h1>
          <p className="mt-3 text-stone">Your order has been created and is awaiting payment confirmation.</p>
          <p className="mt-4 text-sm text-stone">Order ID: {orderId}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/shop" className="rounded-md border border-fog px-5 py-3 text-sm font-semibold text-ink">Continue shopping</Link>
            <Link href="/account/orders" className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">View orders</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.lineItems.filter((item) => !item.savedForLater).length === 0) {
    return (
      <div className="py-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Checkout" }]} />
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Checkout</h1>
        <p className="mt-4 text-stone">Your cart is empty. Add something beautiful before checking out.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Shop now</Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Checkout</h1>
      <p className="mt-2 text-sm text-stone">Secure guest checkout. Payment methods will be added in the billing phase.</p>

      {error && <p role="alert" className="mt-4 rounded-md bg-paper p-3 text-[13px] leading-[18px] text-error">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form onSubmit={submit} className="rounded-md bg-white p-6 shadow-rest lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-ink">Delivery address</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ["fullName", "Full name"], ["phone", "Phone"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2 (optional)"],
              ["city", "City"], ["state", "State"], ["postalCode", "PIN code"], ["country", "Country"],
            ] as const).map(([field, label]) => (
              <label key={field} className={field === "addressLine1" || field === "addressLine2" ? "sm:col-span-2" : ""}>
                <span className="text-sm font-medium text-ink">{label}</span>
                <input
                  required={!field.includes("Line2")}
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  className="mt-1 w-full rounded-md border border-fog bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
                  autoComplete={field === "postalCode" ? "postal-code" : field === "fullName" ? "name" : undefined}
                />
              </label>
            ))}
          </div>
          <Button type="submit" variant="primary" fullWidth className="mt-6" disabled={submitting}>
            {submitting ? "Placing order…" : "Place order"}
          </Button>
          <p className="mt-3 text-center text-xs text-stone">No payment is collected on this step. Billing and payment gateway integration comes next.</p>
        </form>

        <aside className="h-fit rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-display text-xl font-semibold text-ink">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-stone">Items</span><span>{totals.itemCount}</span></div>
            <div className="flex justify-between"><span className="text-stone">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            {totals.discountAmount > 0 && <div className="flex justify-between"><span className="text-stone">Discount</span><span>-{formatCurrency(totals.discountAmount)}</span></div>}
            <div className="border-t border-fog pt-3 flex justify-between font-semibold text-ink"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
          <Link href="/cart" className="mt-5 inline-block text-sm font-semibold text-ink underline underline-offset-4">Edit cart</Link>
        </aside>
      </div>
    </div>
  );
}
