"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { adminApi, type AdminCustomer, type AdminInvoice, type AdminProduct } from "@/admin/lib/admin-api-client";

type BillRow = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  mrp?: number;
  quantity: number;
  discountAmount: number;
  stockQuantity: number;
};

const sizes = [
  { id: "A4", label: "A4", note: "Full-size GST invoice" },
  { id: "A5", label: "A5", note: "Compact elegant invoice" },
  { id: "THERMAL_80MM", label: "80mm", note: "Thermal / POS" },
  { id: "THERMAL_58MM", label: "58mm", note: "Small thermal" },
] as const;

const formats = [
  { id: "STANDARD", label: "Standard", note: "Clean business layout" },
  { id: "COMPACT", label: "Compact", note: "Less paper, same details" },
  { id: "THERMAL", label: "Thermal", note: "Receipt-friendly layout" },
] as const;

const moods = [
  { id: "CLASSIC", label: "Elegant / Classic", text: "Timeless beauty, always ♥", artwork: "/invoice-art/sketch.svg" },
  { id: "MINIMAL", label: "Minimal / Clean", text: "You are beautiful, just the way you are ♥", artwork: "/invoice-art/compliment.svg" },
  { id: "TRENDY", label: "Young / Trendy", text: "Good vibes only ♥", artwork: "/invoice-art/playful.svg" },
  { id: "COMPLIMENT", label: "Compliment / Warm", text: "A little Silku love for you ♥", artwork: "/invoice-art/compliment.svg" },
  { id: "FUNNY", label: "Funny / Playful", text: "You look amazing today! ✦", artwork: "/invoice-art/playful.svg" },
  { id: "NATURE", label: "Nature / Calm", text: "Fresh looks better on you", artwork: "/invoice-art/sketch.svg" },
] as const;

const STORAGE_KEY = "silku-invoice-preferences";

type Preferences = {
  size: (typeof sizes)[number]["id"];
  format: (typeof formats)[number]["id"];
  mood: (typeof moods)[number]["id"];
};

const defaultPreferences: Preferences = { size: "A4", format: "STANDARD", mood: "CLASSIC" };

function ManualBilling() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [rows, setRows] = useState<BillRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "bank_transfer" | "other">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState<AdminInvoice | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.searchCustomers(new URLSearchParams({ page: "1", pageSize: "100" })),
      adminApi.listProducts(new URLSearchParams({ page: "1", pageSize: "100" })),
    ]).then(([customerResult, productResult]) => {
      setCustomers(customerResult.items);
      setProducts(productResult.items);
    }).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load billing data.");
    }).finally(() => setLoading(false));
  }, []);

  const visibleCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((customer) =>
      [customer.firstName, customer.lastName, customer.email].join(" ").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (!q) return true;
      return product.name.toLowerCase().includes(q) ||
        (product.variants ?? []).some((variant) => variant.sku.toLowerCase().includes(q) || variant.name.toLowerCase().includes(q));
    }).slice(0, 20);
  }, [products, productSearch]);

  const subtotal = rows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0);
  const discount = rows.reduce((sum, row) => sum + row.discountAmount, 0);
  const totalBeforeTax = Math.max(0, subtotal - discount);

  const addVariant = (product: AdminProduct, variant: NonNullable<AdminProduct["variants"]>[number]) => {
    setMessage("");
    setRows((current) => {
      const existing = current.find((row) => row.variantId === variant.id);
      if (existing) {
        return current.map((row) => row.variantId === variant.id ? { ...row, quantity: row.quantity + 1 } : row);
      }
      const defaultPrice = Number(product.salePrice ?? product.price ?? 0);
      return [...current, {
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        unitPrice: defaultPrice,
        mrp: variant.mrp ? Number(variant.mrp) : undefined,
        quantity: 1,
        discountAmount: 0,
        stockQuantity: variant.stockQuantity ?? 0,
      }];
    });
  };

  const updateRow = (variantId: string, patch: Partial<BillRow>) => {
    setRows((current) => current.map((row) => row.variantId === variantId ? { ...row, ...patch } : row));
  };

  const removeRow = (variantId: string) => setRows((current) => current.filter((row) => row.variantId !== variantId));

  const createBill = async () => {
    if (rows.length === 0) return setMessage("Add at least one product.");
    if (!selectedCustomer && !walkInName.trim()) return setMessage("Select a customer or enter a walk-in customer name.");
    if (rows.some((row) => row.quantity < 1 || row.quantity > row.stockQuantity)) return setMessage("Quantity cannot exceed available stock.");

    setSaving(true);
    setMessage("");
    setInvoice(null);
    try {
      const result = await adminApi.createManualBilling({
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? [selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(" ") : walkInName.trim(),
        customerEmail: selectedCustomer?.email ?? walkInEmail.trim() || undefined,
        customerPhone: selectedCustomer ? undefined : walkInPhone.trim() || undefined,
        items: rows.map((row) => ({
          variantId: row.variantId,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          discountAmount: row.discountAmount,
        })),
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setInvoice(result);
      setMessage("Manual bill created successfully.");
      setRows([]);
      setSelectedCustomer(null);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInEmail("");
      setPaymentReference("");
      setNotes("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Manual bill could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Manual Billing</h2>
          <p className="mt-1 text-sm text-muted">Create a paid manual bill without using the online payment gateway.</p>
        </div>
        <span className="rounded-full bg-secondary-blush px-3 py-1 text-xs font-semibold text-primary-plum">Admin only</span>
      </div>

      {message && <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm">{message}</div>}

      {invoice && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="font-semibold text-ink">Bill created</div>
          <div className="mt-1 text-sm">Invoice: <strong>{invoice.invoiceNumber}</strong> · Total: <strong>₹{invoice.total}</strong></div>
          <Link href={`/admin/orders/${invoice.orderId}`} className="mt-3 inline-block text-sm font-semibold text-primary-rose hover:underline">Open order / invoice →</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">1. Customer</h3>
          <div className="mt-3 space-y-3">
            <Input label="Search existing customer" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Name or email" />
            {!selectedCustomer && visibleCustomers.length > 0 && (
              <div className="rounded-lg border border-line divide-y">
                {visibleCustomers.map((customer) => (
                  <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} className="w-full px-3 py-2 text-left hover:bg-surface">
                    <div className="text-sm font-semibold">{customer.firstName} {customer.lastName}</div>
                    <div className="text-xs text-muted">{customer.email}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer ? (
              <div className="rounded-lg border border-primary-plum bg-secondary-blush p-3 text-sm">
                <strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong>
                <div className="text-xs text-muted">{selectedCustomer.email}</div>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="mt-2 text-xs font-semibold text-primary-rose">Change customer</button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Walk-in customer</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label="Name" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
                  <Input label="Phone" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} />
                  <Input label="Email (optional)" value={walkInEmail} onChange={(e) => setWalkInEmail(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold">2. Add products</h3>
          <div className="mt-3">
            <Input label="Search product / SKU" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search..." />
            {loading ? <div className="mt-3 text-sm text-muted">Loading products…</div> : (
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-line divide-y">
                {visibleProducts.flatMap((product) => (product.variants ?? []).map((variant) => (
                  <button key={variant.id} type="button" disabled={(variant.stockQuantity ?? 0) < 1} onClick={() => addVariant(product, variant)} className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40">
                    <span><span className="block text-sm font-semibold">{product.name}{variant.name ? ` — ${variant.name}` : ""}</span><span className="text-xs text-muted">{variant.sku} · Stock {variant.stockQuantity ?? 0}</span></span>
                    <span className="text-sm font-semibold">₹{Number(product.salePrice ?? product.price ?? 0).toFixed(2)}</span>
                  </button>
                )))}
                {!visibleProducts.some((product) => (product.variants ?? []).length > 0) && <div className="p-4 text-sm text-muted">No matching products found.</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-7">
        <h3 className="font-semibold">3. Bill items</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="p-3">Product</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3">Discount</th><th className="p-3">Line total</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.variantId} className="border-t border-line">
                  <td className="p-3"><div className="font-semibold">{row.productName}</div><div className="text-xs text-muted">{row.variantName} · {row.sku} · MRP ₹{row.mrp?.toFixed(2) ?? "—"}</div></td>
                  <td className="p-3"><input className="w-20 rounded border border-line px-2 py-2" type="number" min={1} max={row.stockQuantity} value={row.quantity} onChange={(e) => updateRow(row.variantId, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></td>
                  <td className="p-3"><input className="w-28 rounded border border-line px-2 py-2" type="number" min={0} step="0.01" value={row.unitPrice} onChange={(e) => updateRow(row.variantId, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} /></td>
                  <td className="p-3"><input className="w-28 rounded border border-line px-2 py-2" type="number" min={0} step="0.01" value={row.discountAmount} onChange={(e) => updateRow(row.variantId, { discountAmount: Math.max(0, Number(e.target.value) || 0) })} /></td>
                  <td className="p-3 font-semibold">₹{Math.max(0, row.unitPrice * row.quantity - row.discountAmount).toFixed(2)}</td>
                  <td className="p-3"><button type="button" onClick={() => removeRow(row.variantId)} className="text-xs font-semibold text-primary-rose">Remove</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted">No items added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <h3 className="font-semibold">4. Payment</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Payment method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="mt-1 h-11 w-full rounded border border-line px-3">
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
              </select>
            </div>
            <Input label="Payment reference (optional)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="UTR / transaction reference" />
          </div>
          <Input label="Internal note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any admin note for this bill" />
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between text-sm"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold"><span>Before GST</span><span>₹{totalBeforeTax.toFixed(2)}</span></div>
          <Button variant="primary" onClick={createBill} disabled={saving || loading} className="mt-4 w-full">{saving ? "Creating bill…" : "Create Manual Bill"}</Button>
          <p className="mt-2 text-[11px] leading-4 text-muted">Creating the bill marks it confirmed and deducts the selected quantity from inventory.</p>
        </div>
      </div>
    </section>
  );
}

function InvoiceStudio() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPreferences({ ...defaultPreferences, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const selectedMood = useMemo(() => moods.find((item) => item.id === preferences.mood) ?? moods[0], [preferences.mood]);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); };
  const save = () => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); setSaved(true); };

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-xl font-semibold text-ink">Invoice Studio</h2>
      <p className="mt-1 text-sm text-muted">Choose the preferred print layout and customer greeting for invoices.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Bill size</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sizes.map((item) => <button key={item.id} type="button" onClick={() => update("size", item.id)} className={`rounded-lg border p-3 text-left ${preferences.size === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}><div className="font-semibold">{item.label}</div><div className="text-xs text-muted">{item.note}</div></button>)}
          </div>
          <h3 className="mt-6 font-semibold">Invoice format</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {formats.map((item) => <button key={item.id} type="button" onClick={() => update("format", item.id)} className={`rounded-lg border p-3 text-left ${preferences.format === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}><div className="font-semibold">{item.label}</div><div className="text-xs text-muted">{item.note}</div></button>)}
          </div>
          <h3 className="mt-6 font-semibold">Greeting style</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {moods.map((item) => <button key={item.id} type="button" onClick={() => update("mood", item.id)} className={`rounded-lg border p-2 text-left ${preferences.mood === item.id ? "border-primary-plum ring-1 ring-primary-plum" : "border-line"}`}><img src={item.artwork} alt="" className="h-16 w-full rounded object-cover" /><div className="mt-2 text-xs font-semibold">{item.label}</div></button>)}
          </div>
          <div className="mt-5 flex items-center gap-3"><Button variant="primary" onClick={save}>Save preferences</Button>{saved && <span className="text-xs text-success">Saved on this device.</span>}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mx-auto max-w-sm overflow-hidden rounded border border-line bg-white">
            <div className="border-b border-line p-5 text-center"><div className="font-display text-2xl tracking-[0.18em]">SILKU</div><div className="text-[10px] uppercase tracking-[0.2em] text-muted">Tax Invoice</div></div>
            <div className="p-5 text-sm"><div className="font-semibold">Customer Name</div><div className="mt-4 flex justify-between text-xs"><span>Beauty Product × 1</span><span>₹699</span></div><div className="mt-2 flex justify-between text-xs"><span>Face Serum × 1</span><span>₹1,299</span></div><div className="mt-3 flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span>₹1,708</span></div></div>
            <div className="relative min-h-28 overflow-hidden p-5 text-center"><img src={selectedMood.artwork} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="relative z-10 text-sm font-semibold text-primary-plum">{selectedMood.text}</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BillingPage() {
  return <RequireAdminAuth><AdminShell><RoleGate module="billing" level="view"><div className="flex flex-col gap-6"><div><h1 className="font-display text-[32px] font-semibold text-ink">Billing</h1><p className="mt-1 text-sm text-muted">Create manual bills and manage invoice presentation.</p></div><RoleGate module="billing" level="edit"><ManualBilling /></RoleGate><InvoiceStudio /></div></RoleGate></AdminShell></RequireAdminAuth>;
}
