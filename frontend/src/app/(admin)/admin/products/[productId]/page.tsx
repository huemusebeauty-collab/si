"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, type AdminProductDetail } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

function EditProductContent() {
  const params = useParams<{ productId: string }>();
  const id = params.productId;
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [form, setForm] = useState({ name: "", slug: "", categorySlug: "", price: "", salePrice: "", mrp: "", gstRate: "", hsnCode: "", taxInclusiveMrp: true, description: "", shortDescription: "", ingredients: "", mediaText: "", sku: "", variantName: "", stock: "0" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([adminApi.getAdminProduct(id), adminApi.listCategories()]).then(([p, cats]) => {
      setProduct(p); setCategories(cats);
      const v = p.variants[0];
      setForm({
        name: p.name, slug: p.slug, categorySlug: p.category?.slug ?? "", price: p.price, salePrice: p.salePrice ?? "",
        mrp: v?.mrp ?? "", gstRate: p.gstRate ?? "", hsnCode: p.hsnCode ?? "", taxInclusiveMrp: p.taxInclusiveMrp,
        description: p.description ?? "", shortDescription: p.content?.shortDescription ?? "", ingredients: p.content?.ingredients ?? "",
        mediaText: p.mediaUrls.join("\n"), sku: v?.sku ?? "", variantName: v?.name ?? "Default", stock: String(v?.stockQuantity ?? 0),
      });
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load product.")).finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setError(null); setMessage(null);
    const price = Number(form.price), mrp = Number(form.mrp);
    const salePrice = form.salePrice ? Number(form.salePrice) : undefined;
    const gstRate = form.gstRate ? Number(form.gstRate) : undefined;
    const stock = Number(form.stock);
    if (!form.name || !form.slug || !form.categorySlug || !form.sku || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp) || mrp < price) { setError("Check name, slug, category, SKU, price and MRP. MRP cannot be below price."); return; }
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) { setError("Sale price must be between ₹0 and the regular price."); return; }
    if (gstRate !== undefined && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)) { setError("GST rate must be between 0% and 100%."); return; }
    if (!Number.isInteger(stock) || stock < 0) { setError("Stock must be a non-negative integer."); return; }
    setSaving(true);
    try {
      await adminApi.updateProduct(id, {
        name: form.name, slug: form.slug, categorySlug: form.categorySlug, price, salePrice,
        description: form.description, metaTitle: form.name, metaDescription: form.shortDescription || form.description,
        mediaUrls: form.mediaText.split("\n").map(v => v.trim()).filter(Boolean),
        content: { shortDescription: form.shortDescription || form.description, keyBenefits: [], features: [], ingredients: form.ingredients, usageInstructions: [], warnings: "", storageInstructions: "", specifications: {}, faqs: [] },
        hsnCode: form.hsnCode.trim() || undefined, gstRate, taxInclusiveMrp: form.taxInclusiveMrp,
        variants: [{ sku: form.sku, name: form.variantName || "Default", stockQuantity: stock, mrp }],
      });
      setMessage("Product updated successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update product."); }
    finally { setSaving(false); }
  }

  if (loading) return <div>Loading product…</div>;
  if (!product) return <Alert tone="error">{error ?? "Product not found."}</Alert>;

  return <div className="flex max-w-5xl flex-col gap-6">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-[32px] font-semibold text-ink">Edit Product</h1><p className="text-sm text-muted">{product.id}</p></div><Link href="/admin/products" className="text-sm font-semibold text-primary-plum">Back to Products</Link></div>
    {error && <Alert tone="error">{error}</Alert>}{message && <Alert tone="success">{message}</Alert>}
    <RoleGate module="products" level="edit" fallback={<Alert tone="information">You do not have permission to edit products.</Alert>}>
      <div className="grid gap-5 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Product name<input className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="text-sm font-semibold">Slug<input className={inputClass} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label>
        <label className="text-sm font-semibold">Category<select className={inputClass} value={form.categorySlug} onChange={e=>setForm({...form,categorySlug:e.target.value})}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Price<input className={inputClass} type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
        <label className="text-sm font-semibold">MRP<input className={inputClass} type="number" min="0" step="0.01" value={form.mrp} onChange={e=>setForm({...form,mrp:e.target.value})}/></label>
        <label className="text-sm font-semibold">GST %<input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.gstRate} onChange={e=>setForm({...form,gstRate:e.target.value})}/></label>
        <label className="text-sm font-semibold">HSN code<input className={inputClass} value={form.hsnCode} onChange={e=>setForm({...form,hsnCode:e.target.value})}/></label>
        <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.taxInclusiveMrp} onChange={e=>setForm({...form,taxInclusiveMrp:e.target.checked})}/> MRP is tax-inclusive</label>
        <label className="text-sm font-semibold">Sale price<input className={inputClass} type="number" min="0" step="0.01" value={form.salePrice} onChange={e=>setForm({...form,salePrice:e.target.value})}/></label>
        <label className="text-sm font-semibold">SKU<input className={inputClass} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
        <label className="text-sm font-semibold">Variant / shade<input className={inputClass} value={form.variantName} onChange={e=>setForm({...form,variantName:e.target.value})}/></label>
        <label className="text-sm font-semibold">Stock<input className={inputClass} type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Short description<input className={inputClass} value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={inputClass+" min-h-28"} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Ingredients<textarea className={inputClass+" min-h-24"} value={form.ingredients} onChange={e=>setForm({...form,ingredients:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Media URLs<textarea className={inputClass+" min-h-24"} value={form.mediaText} onChange={e=>setForm({...form,mediaText:e.target.value})}/></label>
        <div className="sm:col-span-2"><Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Product Changes"}</Button></div>
      </div>
    </RoleGate>
  </div>;
}

export default function EditProductPage() {
  return <RequireAdminAuth><AdminShell><EditProductContent /></AdminShell></RequireAdminAuth>;
}
