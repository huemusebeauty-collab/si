"use client";

import { useMemo, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { Button } from "@/components/basic/Button";

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
  { id: "CLASSIC", label: "Elegant / Classic", text: "Timeless beauty, always ♥", className: "bg-[#f5eee2]" },
  { id: "MINIMAL", label: "Minimal / Clean", text: "You are beautiful, just the way you are ♥", className: "bg-[#f7f3ee]" },
  { id: "TRENDY", label: "Young / Trendy", text: "Good vibes only ♥", className: "bg-[#fde0eb]" },
  { id: "FUNNY", label: "Funny / Playful", text: "You look amazing today! ✦", className: "bg-[#fff3a8]" },
  { id: "NATURE", label: "Nature / Calm", text: "Fresh looks better on you", className: "bg-[#e8f0df]" },
  { id: "FESTIVE", label: "Seasonal / Festive", text: "Beauty is always a good idea ♥", className: "bg-[#ffe0e8]" },
] as const;

function BillingStudio() {
  const [size, setSize] = useState<(typeof sizes)[number]["id"]>("A4");
  const [format, setFormat] = useState<(typeof formats)[number]["id"]>("STANDARD");
  const [mood, setMood] = useState<(typeof moods)[number]["id"]>("TRENDY");

  const selectedMood = useMemo(() => moods.find((item) => item.id === mood) ?? moods[0], [mood]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Billing & Invoice Studio</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">Keep every order detail identical while choosing the paper size, invoice format and a tasteful customer-friendly greeting background.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">1. Bill size</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sizes.map((item) => (
              <button key={item.id} type="button" onClick={() => setSize(item.id)} className={`rounded-lg border p-4 text-left ${size === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}>
                <div className="font-semibold">{item.label}</div><div className="mt-1 text-xs text-muted">{item.note}</div>
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-lg font-semibold text-ink">2. Invoice format</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {formats.map((item) => (
              <button key={item.id} type="button" onClick={() => setFormat(item.id)} className={`rounded-lg border p-4 text-left ${format === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}>
                <div className="font-semibold">{item.label}</div><div className="mt-1 text-xs text-muted">{item.note}</div>
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-lg font-semibold text-ink">3. Greeting background</h2>
          <p className="mt-1 text-sm text-muted">Age/mood-based styling can be selected later from the customer profile; the commercial invoice details remain unchanged.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {moods.map((item) => (
              <button key={item.id} type="button" onClick={() => setMood(item.id)} className={`rounded-lg border p-3 text-left ${mood === item.id ? "border-primary-plum ring-1 ring-primary-plum" : "border-line"}`}>
                <div className={`min-h-20 rounded-md p-3 text-sm ${item.className}`}>{item.text}</div>
                <div className="mt-2 text-xs font-semibold">{item.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button variant="primary" onClick={() => window.alert("Invoice preferences are ready for the next persistence step.")}>Save preferences</Button>
            <span className="text-xs text-muted">Payment gateways intentionally remain separate for later.</span>
          </div>
        </section>

        <aside className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Live preview</h2><span className="text-xs text-muted">{size} · {format}</span></div>
          <div className={`mx-auto max-w-sm overflow-hidden rounded-lg border border-line bg-white shadow-rest`}>
            <div className="border-b border-line p-5 text-center">
              <div className="font-display text-2xl tracking-[0.18em]">SILKU</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">Tax Invoice</div>
            </div>
            <div className="p-5 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-line pb-4"><div><div className="text-xs text-muted">Bill To</div><strong>Customer Name</strong><div className="text-xs text-muted">Customer address</div></div><div><div className="text-xs text-muted">Invoice</div><strong>#SILKU-2025-00123</strong><div className="text-xs text-muted">Currency: INR</div></div></div>
              <div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span>Beauty Product × 1</span><span>₹699</span></div><div className="flex justify-between"><span>Face Serum × 1</span><span>₹1,299</span></div><div className="flex justify-between"><span>Discount</span><span>-₹290</span></div><div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span>₹1,708</span></div></div>
            </div>
            <div className={`min-h-36 p-6 text-center ${selectedMood.className}`}><div className="text-lg font-semibold">{selectedMood.text}</div><div className="mt-3 text-xs text-muted">A little Silku happiness with your order ♥</div><div className="mt-4 text-[10px] uppercase tracking-[0.18em]">Thank you for being part of the Silku family</div></div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">Preview only: customer-specific artwork/photo-sketch assets will be added as a separate controlled media layer, so invoice data never depends on the artwork.</p>
        </aside>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return <RequireAdminAuth><AdminShell><RoleGate module="billing" level="view"><BillingStudio /></RoleGate></AdminShell></RequireAdminAuth>;
}
