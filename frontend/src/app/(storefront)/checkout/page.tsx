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
  getShippingQuote,
  initiatePayment,
  syncPayment,
  type ApiCart,
  type ApiOrder,
  type PaymentIntentResponse,
} from "@/services/api/cart";
import { getStripe } from "@/services/stripe";
import { trackWebsiteEvent } from "@/components/WebsiteEventTracker";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";

const INDIA_STATES: Array<{ name: string; code: string }> = [
  { name: "Andaman and Nicobar Islands", code: "35" },
  { name: "Andhra Pradesh", code: "37" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chandigarh", code: "04" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { name: "Delhi", code: "07" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Ladakh", code: "38" },
  { name: "Lakshadweep", code: "31" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Manipur", code: "14" },
  { name: "Meghalaya", code: "17" },
  { name: "Mizoram", code: "15" },
  { name: "Nagaland", code: "13" },
  { name: "Odisha", code: "21" },
  { name: "Puducherry", code: "34" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Sikkim", code: "11" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Tripura", code: "16" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
];

function resolveIndiaState(value: string): { name: string; code: string } | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return INDIA_STATES.find((item) =>
    item.name.toLowerCase() === normalized ||
    item.code === normalized ||
    item.name.toLowerCase().startsWith(normalized) ||
    ({ rj: "rajasthan", mh: "maharashtra", dl: "delhi", hr: "haryana", pb: "punjab", gj: "gujarat", up: "uttar pradesh", mp: "madhya pradesh", ka: "karnataka", tn: "tamil nadu", kl: "kerala", wb: "west bengal", od: "odisha", ap: "andhra pradesh", ts: "telangana", br: "bihar", jh: "jharkhand", cg: "chhattisgarh", hp: "himachal pradesh", uk: "uttarakhand", jk: "jammu and kashmir", go: "goa", as: "assam", ar: "arunachal pradesh", mn: "manipur", ml: "meghalaya", mz: "mizoram", nl: "nagaland", sk: "sikkim", tr: "tripura", py: "puducherry", ch: "chandigarh", ld: "lakshadweep", an: "andaman and nicobar islands", la: "ladakh", dd: "dadra and nagar haveli and daman and diu" } as Record<string, string>)[normalized] === item.name.toLowerCase()
  ) ?? null;
}


export default function CheckoutPage() {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 });
  const [shippingQuote, setShippingQuote] = useState<{ shippingAmount: number; freeShipping: boolean; threshold: number; region: string } | null>(null);
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
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");

  useEffect(() => {
    if (form.country !== "IN" || !form.stateCode) { setShippingQuote(null); return; }
    void getShippingQuote(Math.max(0, totals.subtotal - totals.discountAmount), form.stateCode, form.country).then(setShippingQuote).catch(() => setShippingQuote(null));
  }, [form.country, form.stateCode, totals.subtotal, totals.discountAmount]);

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
      if (form.country === "IN" && !form.stateCode) throw new Error("Please select the delivery state.");
      if (form.country === "IN" && !/^\d{2}$/.test(form.stateCode)) throw new Error("Please select a valid delivery state.");
      if (!/^\d{10}$/.test(form.phone)) throw new Error("Please enter a valid 10-digit mobile number.");
      const createdOrder = await createOrder({ ...form, phone: `${phoneCountryCode}${form.phone}` });
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
        syncResult = await syncPayment(payment.providerReference, order.guestCheckoutToken);
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
                {field === "phone" ? (
                  <div className="mt-1 flex gap-2">
                    <select
                      aria-label="Country calling code"
                      value={phoneCountryCode}
                      onChange={(event) => setPhoneCountryCode(event.target.value)}
                      className="w-24 rounded-md border border-fog bg-white px-2 py-3 text-sm text-ink outline-none focus:border-ink"
                    >
                      <option value="+91">+91 India</option>
                    </select>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="min-w-0 flex-1 rounded-md border border-fog bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                ) : field === "state" ? (
                  <div className="mt-1 space-y-2">
                    <select
                      required={!form.state}
                      value={form.state}
                      onChange={(event) => {
                        const selected = INDIA_STATES.find((item) => item.name === event.target.value);
                        setForm((current) => ({
                          ...current,
                          state: selected?.name ?? "",
                          stateCode: selected?.code ?? "",
                        }));
                      }}
                      className="w-full rounded-md border border-fog bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
                    >
                      <option value="">Select state / UT</option>
                      {INDIA_STATES.map((item) => (
                        <option key={item.code} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Enter state name or state code"
                        value={form.state && form.stateCode ? "" : form.state}
                        onChange={(event) => {
                          const value = event.target.value;
                          const selected = resolveIndiaState(value);
                          setForm((current) => ({
                            ...current,
                            state: selected?.name ?? value,
                            stateCode: selected?.code ?? "",
                          }));
                        }}
                        onBlur={() => {
                          const selected = resolveIndiaState(form.state);
                          if (selected) {
                            setForm((current) => ({ ...current, state: selected.name, stateCode: selected.code }));
                          }
                        }}
                        list="india-state-options"
                        className="min-w-0 flex-1 rounded-md border border-fog bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
                        placeholder="Or type Rajasthan / RJ / 08"
                        autoComplete="address-level1"
                      />
                      <span className="shrink-0 text-xs text-stone">or type name / code</span>
                    </div>
                    <datalist id="india-state-options">
                      {INDIA_STATES.map((item) => (
                        <option key={item.code} value={item.name}>{item.code}</option>
                      ))}
                    </datalist>
                  </div>
                ) : field === "stateCode" ? (
                  <input
                    required
                    value={form.stateCode}
                    readOnly
                    aria-readonly="true"
                    className="mt-1 w-full rounded-md border border-fog bg-stone/5 px-3 py-3 text-sm text-ink outline-none"
                    placeholder="Auto-filled from state"
                  />
                ) : (
                  <input
                    required={!["addressLine2", "customerLegalName", "customerGstin"].includes(field)}
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    className="mt-1 w-full rounded-md border border-fog bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
                    autoComplete={field === "postalCode" ? "postal-code" : field === "fullName" ? "name" : undefined}
                    maxLength={field === "customerGstin" ? 15 : undefined}
                  />
                )}
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
            {shippingQuote && <div className="flex justify-between"><span className="text-stone">Shipping / Logistics</span><span>{shippingQuote.freeShipping ? "FREE" : formatCurrency(shippingQuote.shippingAmount)}</span></div>}
            {shippingQuote && !shippingQuote.freeShipping && <p className="text-xs text-stone">Free shipping on orders ₹500 or above.</p>}
            {shippingQuote?.freeShipping && <p className="text-xs text-stone">Free shipping applied.</p>}
            <div className="border-t border-fog pt-3 flex justify-between font-semibold text-ink"><span>Total</span><span>{formatCurrency(totals.total + (shippingQuote?.shippingAmount ?? 0))}</span></div>
          </div>
          <Link href="/cart" className="mt-5 inline-block text-sm font-semibold text-ink underline underline-offset-4">Edit cart</Link>
        </aside>
      </div>
    </div>
  );
}
