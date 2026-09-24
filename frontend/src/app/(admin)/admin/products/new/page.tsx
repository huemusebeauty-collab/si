"use client";

import { useState } from "react";

type MediaItem = { url: string; type: "image" | "video" };
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

function NewProductContent() {
  const { data: categories } = useAdminQuery(() => adminApi.listCategories(), []);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [taxInclusiveMrp, setTaxInclusiveMrp] = useState(true);
  const [salePrice, setSalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sku, setSku] = useState("");
  const [variantName, setVariantName] = useState("Default");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null); setSuccess(null);
    if (!name || !slug || !categorySlug || !price || !mrp || !sku) {
      setError("Name, slug, category, price, MRP and SKU are required."); return;
    }
    const imageCount = mediaItems.filter((item) => item.type === "image").length;
    const videoCount = mediaItems.filter((item) => item.type === "video").length;
    if (imageCount < 2 || videoCount < 1) {
      setError("Add at least 2 product photos and 1 product video before saving."); return;
    }
    const priceValue = Number(price);
    const mrpValue = Number(mrp);
    const salePriceValue = salePrice ? Number(salePrice) : undefined;
    const gstValue = gstRate ? Number(gstRate) : undefined;
    if (!Number.isFinite(priceValue) || priceValue <= 0 || !Number.isFinite(mrpValue) || mrpValue < 0) {
      setError("Price and MRP must be valid amounts."); return;
    }
    if (mrpValue < priceValue) {
      setError("MRP cannot be lower than the product price."); return;
    }
    if (salePriceValue !== undefined && (!Number.isFinite(salePriceValue) || salePriceValue < 0 || salePriceValue > priceValue)) {
      setError("Sale price must be between ₹0 and the regular price."); return;
    }
    if (gstValue !== undefined && (!Number.isFinite(gstValue) || gstValue < 0 || gstValue > 100)) {
      setError("GST rate must be between 0% and 100%."); return;
    }
    setSaving(true);
    try {
      const created = await adminApi.createProduct({
        name, slug, categorySlug, price: priceValue, salePrice: salePriceValue,
        description, metaTitle: name, metaDescription: shortDescription || description,
        mediaUrls: mediaItems.map((item) => item.url),
        content: {
          shortDescription: shortDescription || description,
          keyBenefits: [], features: [], ingredients,
          usageInstructions: [], warnings: "", storageInstructions: "",
          specifications: {}, faqs: [],
        },
        hsnCode: hsnCode.trim() || undefined,
        gstRate: gstValue,
        taxInclusiveMrp,
        variants: [{ sku, name: variantName || "Default", stockQuantity: Number(stock) || 0, mrp: mrpValue }],
      });
      setSuccess(`Product draft saved successfully (${created.entity.id}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-[32px] font-semibold text-ink">Add Product</h1><p className="mt-1 text-sm text-muted">Create a catalogue item with pricing, GST/MRP, SKU, stock and media.</p></div>
        <Link href="/admin/products" className="text-sm font-semibold text-primary-plum">Back to Products</Link>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <RoleGate module="products" level="edit" fallback={<Alert tone="information">You do not have permission to create products.</Alert>}>
        <div className="grid gap-5 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Product name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Silku Rose Glow Lipstick" /></label>
          <label className="text-sm font-semibold">Slug<input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="silku-rose-glow-lipstick" /></label>
          <label className="text-sm font-semibold">Category<select className={inputClass} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}><option value="">Select category</option>{(categories ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Price<input className={inputClass} type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className="text-sm font-semibold">MRP<input className={inputClass} type="number" min="0" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="499" /></label>
          <label className="text-sm font-semibold">GST rate %<input className={inputClass} type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(e) => setGstRate(e.target.value)} placeholder="18" /></label>
          <label className="text-sm font-semibold">HSN code<input className={inputClass} value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="3304" /></label>
          <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={taxInclusiveMrp} onChange={(e) => setTaxInclusiveMrp(e.target.checked)} /> MRP is tax-inclusive <span className="font-normal text-muted">(GST is calculated within the MRP)</span></label>
          <label className="text-sm font-semibold">Sale price (optional)<input className={inputClass} type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></label>
          <label className="text-sm font-semibold">SKU<input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKL-RG-001" /></label>
          <label className="text-sm font-semibold">Variant / shade name<input className={inputClass} value={variantName} onChange={(e) => setVariantName(e.target.value)} /></label>
          <label className="text-sm font-semibold">Opening stock<input className={inputClass} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Short description<input className={inputClass} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One-line product benefit" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={inputClass + " min-h-28"} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Ingredients<textarea className={inputClass + " min-h-24"} value={ingredients} onChange={(e) => setIngredients(e.target.value)} /></label>
          <div className="sm:col-span-2 rounded-lg border border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Product Media</p><p className="text-xs font-normal text-muted">Add multiple product photos and at least one product video. Images/videos upload directly to the configured storage.</p></div><label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-surface"><input className="hidden" type="file" accept="image/*,video/mp4,video/webm" multiple disabled={uploading} onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.currentTarget.value = ""; if (!files.length) return; setError(null); setUploading(true); try { const uploaded: MediaItem[] = []; for (const file of files) { const result = await adminApi.uploadMedia(file); uploaded.push({ url: result.url, type: file.type.startsWith("video/") ? "video" : "image" }); } setMediaItems((items) => [...items, ...uploaded]); } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload media."); } finally { setUploading(false); } }} />{uploading ? "Uploading…" : "＋ Add photos / video"}</label></div>
            {mediaItems.length === 0 ? <p className="text-sm text-muted">No media added yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{mediaItems.map((item, index) => <div key={item.url} className="rounded-lg border border-line p-3"><div className="mb-2 aspect-video overflow-hidden rounded-md bg-surface">{item.type === "video" ? <video src={item.url} controls className="h-full w-full object-contain"><track kind="captions" src="data:text/vtt,WEBVTT%0A" srcLang="en" label="Captions" /></video> : <img src={item.url} alt={`Product media ${index + 1}`} className="h-full w-full object-contain" />}</div><div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted">{item.type === "video" ? "Video" : "Image"} {index + 1}</span><div className="flex gap-1"><Button variant="text" disabled={index === 0} onClick={() => setMediaItems((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</Button><Button variant="text" disabled={index === mediaItems.length - 1} onClick={() => setMediaItems((items) => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}>↓</Button><Button variant="text" onClick={() => setMediaItems((items) => items.filter((_, i) => i !== index))}>Remove</Button></div></div></div>)}</div>}
          </div>
          <div className="sm:col-span-2"><Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Product Draft"}</Button></div>
        </div>
      </RoleGate>
    </div>
  );
}

export default function NewProductPage() {
  return <RequireAdminAuth><AdminShell><NewProductContent /></AdminShell></RequireAdminAuth>;
}
