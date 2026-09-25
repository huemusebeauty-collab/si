"use client";

import { useEffect, useState } from "react";

type MediaItem = { url: string; type: "image" | "video" };
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
  const [form, setForm] = useState({ name: "", slug: "", categorySlug: "", price: "", salePrice: "", gstRate: "", hsnCode: "", taxInclusiveMrp: true, description: "", shortDescription: "", ingredients: "" });
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Array<{ id?: string; sku: string; name: string; hexColor: string; stock: string; mrp: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([adminApi.getAdminProduct(id), adminApi.listCategories()]).then(([p, cats]) => {
      setProduct(p); setCategories(cats);
      setForm({
        name: p.name, slug: p.slug, categorySlug: p.category?.slug ?? "", price: p.price, salePrice: p.salePrice ?? "",
        gstRate: p.gstRate ?? "", hsnCode: p.hsnCode ?? "", taxInclusiveMrp: p.taxInclusiveMrp,
        description: p.description ?? "", shortDescription: p.content?.shortDescription ?? "", ingredients: p.content?.ingredients ?? "",

      });
      setMediaItems(p.mediaUrls.map((url) => ({ url, type: /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(url) ? "video" : "image" })));
      setVariants(p.variants.map(item => ({
        id: item.id, sku: item.sku, name: item.name, hexColor: item.hexColor ?? "", stock: String(item.stockQuantity), mrp: item.mrp ?? "",
      })));
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load product.")).finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setError(null); setMessage(null);
    const imageCount = mediaItems.filter((item) => item.type === "image").length;
    const videoCount = mediaItems.filter((item) => item.type === "video").length;
    if (imageCount < 2 || videoCount < 1) { setError("Add at least 2 product photos and 1 product video before saving."); return; }
    const price = Number(form.price);
    const salePrice = form.salePrice ? Number(form.salePrice) : undefined;
    const gstRate = form.gstRate ? Number(form.gstRate) : undefined;
    if (!form.name || !form.slug || !form.categorySlug || !Number.isFinite(price) || price <= 0 || variants.length === 0) { setError("Check name, slug, category, price and add at least one variant."); return; }
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) { setError("Sale price must be between ₹0 and the regular price."); return; }
    if (gstRate !== undefined && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)) { setError("GST rate must be between 0% and 100%."); return; }
    const payloadVariants = variants.map((variant) => ({ ...variant, stockQuantity: Number(variant.stock), mrp: Number(variant.mrp) }));
    const duplicateSkus = new Set<string>();
    for (const variant of payloadVariants) {
      if (!variant.sku.trim() || !variant.name.trim() || !Number.isInteger(variant.stockQuantity) || variant.stockQuantity < 0 || !Number.isFinite(variant.mrp) || variant.mrp < price) {
        setError("Every variant needs a SKU, name, non-negative integer stock, and MRP not below product price."); return;
      }
      if (duplicateSkus.has(variant.sku.trim())) { setError(`Duplicate SKU ${variant.sku.trim()}.`); return; }
      duplicateSkus.add(variant.sku.trim());
    }
    setSaving(true);
    try {
      await adminApi.updateProduct(id, {
        name: form.name, slug: form.slug, categorySlug: form.categorySlug, price, salePrice,
        description: form.description,
        // Preserve content/SEO fields that this screen does not edit.
        // The previous implementation replaced them with empty values on every save.
        metaTitle: product.metaTitle ?? form.name,
        metaDescription: product.metaDescription ?? (form.shortDescription || form.description),
        mediaUrls: mediaItems.map((item) => item.url),
        content: {
          shortDescription: form.shortDescription || form.description,
          keyBenefits: product.content?.keyBenefits ?? [],
          features: product.content?.features ?? [],
          ingredients: form.ingredients,
          usageInstructions: product.content?.usageInstructions ?? [],
          warnings: product.content?.warnings ?? "",
          storageInstructions: product.content?.storageInstructions ?? "",
          specifications: product.content?.specifications ?? {},
          faqs: product.content?.faqs ?? [],
        },
        hsnCode: form.hsnCode.trim() || undefined, gstRate, taxInclusiveMrp: form.taxInclusiveMrp,
        variants: payloadVariants.map(variant => ({
          id: variant.id,
          sku: variant.sku.trim(), name: variant.name.trim(), hexColor: variant.hexColor.trim() || undefined,
          stockQuantity: variant.stockQuantity, mrp: variant.mrp,
        })),
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
        <label className="text-sm font-semibold">GST %<input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.gstRate} onChange={e=>setForm({...form,gstRate:e.target.value})}/></label>
        <label className="text-sm font-semibold">HSN code<input className={inputClass} value={form.hsnCode} onChange={e=>setForm({...form,hsnCode:e.target.value})}/></label>
        <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.taxInclusiveMrp} onChange={e=>setForm({...form,taxInclusiveMrp:e.target.checked})}/> MRP is tax-inclusive</label>
        <label className="text-sm font-semibold">Sale price<input className={inputClass} type="number" min="0" step="0.01" value={form.salePrice} onChange={e=>setForm({...form,salePrice:e.target.value})}/></label>
        <div className="sm:col-span-2 rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-sm font-semibold">Variants / Shades</p><p className="text-xs text-muted">All existing variants are preserved and editable. Deletion is not exposed because the backend does not delete omitted SKUs.</p></div>
            <Button variant="secondary" onClick={() => setVariants([...variants, { sku: "", name: "New Variant", hexColor: "", stock: "0", mrp: form.price || "0" }])}>Add Variant</Button>
          </div>
          <div className="flex flex-col gap-3">
            {variants.map((variant, index) => (
              <div key={variant.id ?? `new-${index}`} className="grid gap-3 rounded-lg bg-surface p-3 sm:grid-cols-5">
                <input className={inputClass} placeholder="SKU" value={variant.sku} onChange={e=>setVariants(variants.map((v,i)=>i===index?{...v,sku:e.target.value}:v))}/>
                <input className={inputClass} placeholder="Variant / shade" value={variant.name} onChange={e=>setVariants(variants.map((v,i)=>i===index?{...v,name:e.target.value}:v))}/>
                <input className={inputClass} placeholder="Hex color" value={variant.hexColor} onChange={e=>setVariants(variants.map((v,i)=>i===index?{...v,hexColor:e.target.value}:v))}/>
                <input className={inputClass} type="number" min="0" step="0.01" placeholder="MRP" value={variant.mrp} onChange={e=>setVariants(variants.map((v,i)=>i===index?{...v,mrp:e.target.value}:v))}/>
                <input className={inputClass} type="number" min="0" step="1" placeholder="Stock" value={variant.stock} onChange={e=>setVariants(variants.map((v,i)=>i===index?{...v,stock:e.target.value}:v))}/>
              </div>
            ))}
          </div>
        </div>
        <label className="text-sm font-semibold sm:col-span-2">Short description<input className={inputClass} value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={inputClass+" min-h-28"} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="text-sm font-semibold sm:col-span-2">Ingredients<textarea className={inputClass+" min-h-24"} value={form.ingredients} onChange={e=>setForm({...form,ingredients:e.target.value})}/></label>
        <div className="sm:col-span-2 rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Product Media</p><p className="text-xs font-normal text-muted">Existing media is preserved. Add multiple product photos and videos; uploads go directly through the admin storage API.</p></div><label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-surface"><input className="hidden" type="file" accept="image/*,video/*" multiple disabled={uploading} onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.currentTarget.value = ""; if (!files.length) return; setError(null); setUploading(true); try { const uploaded: MediaItem[] = []; for (const file of files) { const result = await adminApi.uploadMedia(file); uploaded.push({ url: result.url, type: file.type.startsWith("video/") ? "video" : "image" }); } setMediaItems((items) => [...items, ...uploaded]); } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload media."); } finally { setUploading(false); } }} />{uploading ? "Uploading…" : "＋ Add photos / video"}</label></div>
          {mediaItems.length === 0 ? <p className="text-sm text-muted">No media added yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{mediaItems.map((item, index) => <div key={item.url} className="rounded-lg border border-line p-3"><div className="mb-2 aspect-video overflow-hidden rounded-md bg-surface">{item.type === "video" ? <video src={item.url} controls className="h-full w-full object-contain"><track kind="captions" src="data:text/vtt,WEBVTT%0A" srcLang="en" label="Captions" /></video> : <img src={item.url} alt={`Product media ${index + 1}`} className="h-full w-full object-contain" />}</div><div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted">{item.type === "video" ? "Video" : "Image"} {index + 1}</span><div className="flex gap-1"><Button variant="text" disabled={index === 0} onClick={() => setMediaItems((items) => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</Button><Button variant="text" disabled={index === mediaItems.length - 1} onClick={() => setMediaItems((items) => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}>↓</Button><Button variant="text" onClick={() => setMediaItems((items) => items.filter((_, i) => i !== index))}>Remove</Button></div></div></div>)}</div>}
        </div>
        <div className="sm:col-span-2"><Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Product Changes"}</Button></div>
      </div>
    </RoleGate>
  </div>;
}

export default function EditProductPage() {
  return <RequireAdminAuth><AdminShell><EditProductContent /></AdminShell></RequireAdminAuth>;
}
