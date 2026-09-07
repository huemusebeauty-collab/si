"use client";

import { useEffect, useMemo, useState } from "react";
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

const ageBands = [
  { id: "UNDER_18", label: "Under 18", defaultMood: "MINIMAL" },
  { id: "18_24", label: "18–24", defaultMood: "TRENDY" },
  { id: "25_34", label: "25–34", defaultMood: "COMPLIMENT" },
  { id: "35_49", label: "35–49", defaultMood: "CLASSIC" },
  { id: "50_PLUS", label: "50+", defaultMood: "NATURE" },
  { id: "UNKNOWN", label: "Not provided", defaultMood: "CLASSIC" },
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
  ageBand: (typeof ageBands)[number]["id"];
  mood: (typeof moods)[number]["id"];
};

const defaultPreferences: Preferences = { size: "A4", format: "STANDARD", ageBand: "UNKNOWN", mood: "CLASSIC" };

function BillingStudio() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPreferences({ ...defaultPreferences, ...JSON.parse(raw) });
    } catch {
      // Keep safe defaults if browser storage is unavailable/corrupt.
    }
  }, []);

  const selectedMood = useMemo(() => moods.find((item) => item.id === preferences.mood) ?? moods[0], [preferences.mood]);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const applyAgePreset = (ageBand: Preferences["ageBand"]) => {
    const preset = ageBands.find((item) => item.id === ageBand) ?? ageBands[ageBands.length - 1];
    setSaved(false);
    setPreferences((current) => ({ ...current, ageBand, mood: preset.defaultMood as Preferences["mood"] }));
  };

  const savePreferences = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Billing & Invoice Studio</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">One billing record, multiple print styles. Personalize only the greeting layer; prices, tax, customer and order data stay unchanged.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">1. Bill size</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sizes.map((item) => (
              <button key={item.id} type="button" onClick={() => update("size", item.id)} className={`rounded-lg border p-4 text-left ${preferences.size === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}>
                <div className="font-semibold">{item.label}</div><div className="mt-1 text-xs text-muted">{item.note}</div>
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-lg font-semibold text-ink">2. Invoice format</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {formats.map((item) => (
              <button key={item.id} type="button" onClick={() => update("format", item.id)} className={`rounded-lg border p-4 text-left ${preferences.format === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}>
                <div className="font-semibold">{item.label}</div><div className="mt-1 text-xs text-muted">{item.note}</div>
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-lg font-semibold text-ink">3. Customer greeting</h2>
          <p className="mt-1 text-sm text-muted">Age is used only as an optional style signal. If age is unavailable, Silku uses the neutral classic style.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ageBands.map((item) => (
              <button key={item.id} type="button" onClick={() => applyAgePreset(item.id)} className={`rounded-lg border p-3 text-left ${preferences.ageBand === item.id ? "border-primary-plum bg-secondary-blush" : "border-line"}`}>
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="mt-1 text-xs text-muted">Suggests {moods.find((m) => m.id === item.defaultMood)?.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {moods.map((item) => (
              <button key={item.id} type="button" onClick={() => update("mood", item.id)} className={`rounded-lg border p-2 text-left ${preferences.mood === item.id ? "border-primary-plum ring-1 ring-primary-plum" : "border-line"}`}>
                <img src={item.artwork} alt="" className="h-20 w-full rounded-md object-cover" />
                <div className="mt-2 text-xs font-semibold">{item.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button variant="primary" onClick={savePreferences}>Save preferences</Button>
            {saved && <span className="text-xs font-medium text-success">Saved on this device.</span>}
            <span className="text-xs text-muted">Payment gateways remain separate for later.</span>
          </div>
        </section>

        <aside className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Live preview</h2><span className="text-xs text-muted">{preferences.size} · {preferences.format}</span></div>
          <div className="mx-auto max-w-sm overflow-hidden rounded-lg border border-line bg-white shadow-rest">
            <div className="border-b border-line p-5 text-center">
              <div className="font-display text-2xl tracking-[0.18em]">SILKU</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">Tax Invoice</div>
            </div>
            <div className="p-5 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-line pb-4"><div><div className="text-xs text-muted">Bill To</div><strong>Customer Name</strong><div className="text-xs text-muted">Customer address</div></div><div><div className="text-xs text-muted">Invoice</div><strong>#SILKU-2025-00123</strong><div className="text-xs text-muted">Currency: INR</div></div></div>
              <div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span>Beauty Product × 1</span><span>₹699</span></div><div className="flex justify-between"><span>Face Serum × 1</span><span>₹1,299</span></div><div className="flex justify-between"><span>Discount</span><span>-₹290</span></div><div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span>₹1,708</span></div></div>
            </div>
            <div className="relative min-h-36 overflow-hidden p-6 text-center"><img src={selectedMood.artwork} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="relative z-10"><div className="text-lg font-semibold text-primary-plum">{selectedMood.text}</div><div className="mt-3 text-xs text-charcoal">A little Silku happiness with your order ♥</div><div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-charcoal">Thank you for being part of the Silku family</div></div></div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">Artwork is a separate decorative layer. It can later be generated or selected from approved Silku media without changing the commercial invoice record.</p>
        </aside>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return <RequireAdminAuth><AdminShell><RoleGate module="billing" level="view"><BillingStudio /></RoleGate></AdminShell></RequireAdminAuth>;
}
