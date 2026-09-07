"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, type ProductTaxConfig } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

function TaxEditor() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [data, setData] = useState<ProductTaxConfig | null>(null);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [taxInclusiveMrp, setTaxInclusiveMrp] = useState(true);
  const [mrps, setMrps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi.getProductTax(productId).then((result) => {
      if (!active) return;
      setData(result);
      setHsnCode(result.hsnCode ?? "");
      setGstRate(result.gstRate ?? "");
      setTaxInclusiveMrp(result.taxInclusiveMrp);
      setMrps(Object.fromEntries(result.variants.map((variant) => [variant.variantId, variant.mrp ?? ""])));
    }).catch((error) => {
      if (active) setToast(error instanceof Error ? error.message : "Unable to load tax configuration.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const invalidMrp = useMemo(() => data?.variants.some((variant) => {
    const value = Number(mrps[variant.variantId]);
    return !Number.isFinite(value) || value < 0;
  }) ?? false, [data, mrps]);

  async function save() {
    const parsedGst = gstRate.trim() === "" ? undefined : Number(gstRate);
    if (parsedGst !== undefined && (!Number.isFinite(parsedGst) || parsedGst < 0 || parsedGst > 100)) {
      setToast("GST rate must be between 0 and 100%.");
      return;
    }
    if (invalidMrp) { setToast("Every variant MRP must be a non-negative number."); return; }
    setSaving(true);
    try {
      const result = await adminApi.updateProductTax(productId, {
        hsnCode: hsnCode.trim() || undefined,
        gstRate: parsedGst,
        taxInclusiveMrp,
        variants: data?.variants.map((variant) => ({ variantId: variant.variantId, mrp: Number(mrps[variant.variantId]) })) ?? [],
      });
      setData((current) => current ? { ...current, hsnCode: result.hsnCode, gstRate: result.gstRate, taxInclusiveMrp: result.taxInclusiveMrp, variants: current.variants.map((variant) => ({ ...variant, mrp: result.variants.find((saved) => saved.variantId === variant.variantId)?.mrp ?? variant.mrp })) } : current);
      setToast("GST, HSN and MRP settings saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save tax configuration.");
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-muted">Loading tax configuration…</p>;
  if (!data) return <div className="rounded-xl border border-line bg-white p-6"><p className="text-sm text-muted">Product tax configuration could not be loaded.</p></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted">Product tax configuration</p><h1 className="font-display text-[32px] font-semibold text-ink">{data.productName}</h1></div>
        <Link href="/admin/products"><Button variant="outline">Back to Products</Button></Link>
      </div>
      <div className="grid gap-5 rounded-2xl border border-line bg-white p-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">HSN code<input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="e.g. 330499" className="rounded-lg border border-line px-3 py-2 font-normal" /></label>
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">GST rate %<input value={gstRate} onChange={(e) => setGstRate(e.target.value)} inputMode="decimal" placeholder="e.g. 18" className="rounded-lg border border-line px-3 py-2 font-normal" /></label>
        <label className="flex items-center gap-3 text-sm font-medium text-ink md:col-span-2"><input type="checkbox" checked={taxInclusiveMrp} onChange={(e) => setTaxInclusiveMrp(e.target.checked)} /> MRP is tax-inclusive</label>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Variant MRP</h2>
        <p className="mt-1 text-sm text-muted">Set the maximum retail price used by checkout tax protection.</p>
        <div className="mt-4 space-y-3">
          {data.variants.map((variant) => <div key={variant.variantId} className="grid gap-2 rounded-xl border border-line p-4 md:grid-cols-[1fr_180px]"><div><p className="font-semibold text-ink">{variant.name}</p><p className="text-xs text-muted">SKU: {variant.sku}</p></div><label className="text-sm font-medium text-ink">MRP<input value={mrps[variant.variantId] ?? ""} onChange={(e) => setMrps((current) => ({ ...current, [variant.variantId]: e.target.value }))} inputMode="decimal" className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label></div>)}
        </div>
      </div>
      <RoleGate module="products" level="edit"><div><Button variant="primary" disabled={saving || invalidMrp} onClick={save}>{saving ? "Saving…" : "Save GST / HSN / MRP"}</Button></div></RoleGate>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function ProductTaxPage() { return <RequireAdminAuth><AdminShell><TaxEditor /></AdminShell></RequireAdminAuth>; }
