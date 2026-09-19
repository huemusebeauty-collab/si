"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { Button } from "@/components/basic/Button";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  createOrder,
  getCartTotals,
  getOrCreateGuestCart,
  initiatePayment,
  syncPayment,
  type ApiCart,
  type ApiOrder,
  type PaymentIntentResponse,
} from "@/services/api/cart";
import { getStripe } from "@/services/stripe";
import { trackWebsiteEvent } from "@/components/WebsiteEventTracker";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";

export default function CheckoutPage() {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [payment, setPayment] = useState<PaymentIntentResponse | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const paymentMountRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    stateCode: "",
    postalCode: "",
    country: "IN",
    customerGstin: "",
    customerLegalName: "",
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

  useEffect(() => () => {
    paymentElementRef.current?.destroy();
    paymentElementRef.current = null;
  }, []);

  useEffect(() => {
    if (!payment?.clientSecret || !paymentMountRef.current || paymentComplete) return;
    let cancelled = false;

    async function mountPaymentElement() {
      try {
        const stripe = await getStripe();
        if (!stripe || cancelled || !paymentMountRef.current) throw new Error("Stripe could not be loaded.");
        stripeRef.current = stripe;
        const elements = stripe.elements({ clientSecret: payment.clientSecret });
        elementsRef.current = elements;
        const element = elements.create("payment", { layout: "accordion" });
        element.mount(paymentMountRef.current);
        paymentElementRef.current = element;
        if (!cancelled) setPaymentReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load secure payment form.");
      }
    }

    void mountPaymentElement();
    return () => {
      cancelled = true;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      elementsRef.current = null;
      setPaymentReady(false);
    };
  }, [payment?.clientSecret, paymentComplete]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createPaymentOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (form.country === "IN" && !/^\\d{2}$/.test(form.stateCode)) throw new Error("Please enter the two-digit state/UT code for the delivery address.");
      const createdOrder = await createOrder(form);
      const idempotencyKey = crypto.randomUUID();
      const nextPayment = await initiatePayment(createdOrder, idempotencyKey);
      if (!nextPayment.clientSecret) throw new Error("Payment gateway did not return a secure payment session.");
      setOrder(createdOrder);
      setPayment(nextPayment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start secure payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !payment?.providerReference || !stripeRef.current || !elementsRef.current) {
      setError("Secure payment form is not ready yet.");
      return;
    }

    setError(null);
    setPaying(true);
    try {
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message ?? "Payment could not be completed.");

      let syncResult: unknown = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        syncResult = await syncPayment(payment.providerReference);
        if (typeof syncResult === "object" && syncResult !== null && "status" in syncResult && syncResult.status === "succeeded") break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (typeof syncResult === "object" && syncResult !== null && "status" in syncResult && syncResult.status === "failed") {
        throw new Error("Payment was declined. Your reserved stock has been released; you can try again.");
      }

      if (typeof syncResult === "object" && syncResult !== null && "status" in syncResult && syncResult.status === "succeeded") {
        trackWebsiteEvent("purchase", { orderId: order.id, metadata: { total: Number(order.total), itemCount: totals.itemCount } });
        setPaymentComplete(true);
      } else {
        throw new Error("Payment is still being confirmed. Please wait a moment and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="py-10 text-stone">Loading checkout…</div>;

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

  if (order && payment && paymentComplete) {
    return (
      <div className="py-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Order confirmed" }]} />
        <div className="mt-8 max-w-2xl rounded-md bg-white p-8 shadow-rest">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone">Payment confirmed</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Thank you for your order</h1>
          <p className="mt-3 text-stone">Your payment has been verified by the server and your order is confirmed.</p>
          <dl className="mt-6 space-y-3 border-y border-fog py-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone">Order ID</dt><dd className="font-medium text-ink break-all">{order.id}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone">Total</dt><dd className="font-medium text-ink">{formatCurrency(Number(order.total))}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone">Status</dt><dd className="font-medium text-ink">Confirmed</dd></div>
          </dl>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="inline-flex items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Continue shopping</Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-md border border-fog px-5 py-3 text-sm font-semibold text-ink">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (order && payment) {
    return (
      <div className="py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Payment" }]} />
        <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Secure payment</h1>
        <p className="mt-2 text-sm text-stone">Order {order.id} · {formatCurrency(Number(order.total))}</p>
        {error && <p role="alert" className="mt-4 rounded-md bg-paper p-3 text-[13px] leading-[18px] text-error">{error}</p>}

        <form onSubmit={confirmPayment} className="mt-8 max-w-2xl rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-display text-xl font-semibold text-ink">Payment details</h2>
          <div ref={paymentMountRef} className="mt-5 min-h-[160px]" />
          <Button type="submit" variant="primary" fullWidth className="mt-6" disabled={!paymentReady || paying}>
            {paying ? "Confirming payment…" : "Pay securely"}
          </Button>
          <p className="mt-3 text-center text-xs text-stone">Payments are processed securely by Stripe. Your card details are not stored by Silku.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Checkout</h1>
      <p className="mt-2 text-sm text-stone">Secure guest checkout with Stripe payment.</p>

      {error && <p role="alert" className="mt-4 rounded-md bg-paper p-3 text-[13px] leading-[18px] text-error">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form onSubmit={createPaymentOrder} className="rounded-md bg-white p-6 shadow-rest lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-ink">Delivery address</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ["fullName", "Full name"], ["phone", "Phone"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2 (optional)"],
              ["city", "City"], ["state", "State"], ["stateCode", "State/UT code (2 digits)"], ["postalCode", "PIN code"], ["country", "Country"], ["customerLegalName", "Legal name (optional)"], ["customerGstin", "GSTIN (optional)"],
            ] as const).map(([field, label]) => (
              <label key={field} className={field === "addressLine1" || field === "addressLine2" ? "sm:col-span-2" : ""}>
                <span className="text-sm font-medium text-ink">{label}</span>
                <input
                  required={field !== "addressLine2"}
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  className="mt-1 w-full rounded-md border border-fog bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
                  autoComplete={field === "postalCode" ? "postal-code" : field === "fullName" ? "name" : undefined}
                  maxLength={field === "stateCode" ? 2 : field === "customerGstin" ? 15 : undefined}
                />
              </label>
            ))}
          </div>
          <Button type="submit" variant="primary" fullWidth className="mt-6" disabled={submitting}>
            {submitting ? "Starting secure payment…" : "Continue to payment"}
          </Button>
          <p className="mt-3 text-center text-xs text-stone">Your order total is recalculated and validated by the server before payment.</p>
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
