"use client";

import { useState } from "react";
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
  const [salePrice, setSalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [sku, setSku] = useState("");
  const [variantName, setVariantName] = useState("Default");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null); setSuccess(null);
    if (!name || !slug || !categorySlug || !price || !sku) {
      setError("Name, slug, category, price and SKU are required."); return;
    }
    setSaving(true);
    try {
      await adminApi.createProduct({
        name, slug, categorySlug, price: Number(price), salePrice: salePrice ? Number(salePrice) : undefined,
        description, metaTitle: name, metaDescription: shortDescription || description,
        mediaUrls: mediaText.split("\n").map((v) => v.trim()).filter(Boolean),
        content: {
          shortDescription: shortDescription || description,
          keyBenefits: [], features: [], ingredients,
          usageInstructions: [], warnings: "", storageInstructions: "",
          specifications: {}, faqs: [],
        },
        variants: [{ sku, name: variantName || "Default", stockQuantity: Number(stock) || 0 }],
      });
      setSuccess("Product saved as draft. You can activate it after reviewing the catalogue details.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-[32px] font-semibold text-ink">Add Product</h1><p className="mt-1 text-sm text-muted">Create a catalogue item with SKU, stock and media URLs.</p></div>
        <Link href="/admin/products" className="text-sm font-semibold text-primary-plum">Back to Products</Link>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <RoleGate module="products" level="edit" fallback={<Alert tone="information">You do not have permission to create products.</Alert>}>
        <div className="grid gap-5 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Product name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Silku Rose Glow Lipstick" /></label>
          <label className="text-sm font-semibold">Slug<input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="silku-rose-glow-lipstick" /></label>
          <label className="text-sm font-semibold">Category<select className={inputClass} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}><option value="">Select category</option>{(categories ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Price<input className={inputClass} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className="text-sm font-semibold">Sale price (optional)<input className={inputClass} type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></label>
          <label className="text-sm font-semibold">SKU<input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKL-RG-001" /></label>
          <label className="text-sm font-semibold">Variant / shade name<input className={inputClass} value={variantName} onChange={(e) => setVariantName(e.target.value)} /></label>
          <label className="text-sm font-semibold">Opening stock<input className={inputClass} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Short description<input className={inputClass} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One-line product benefit" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={inputClass + " min-h-28"} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Ingredients<textarea className={inputClass + " min-h-24"} value={ingredients} onChange={(e) => setIngredients(e.target.value)} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Media URLs <span className="font-normal text-muted">(one image/video URL per line)</span><textarea className={inputClass + " min-h-28"} value={mediaText} onChange={(e) => setMediaText(e.target.value)} placeholder="https://.../product-front.webp\nhttps://.../product-demo.mp4" /></label>
          <div className="sm:col-span-2"><Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Product Draft"}</Button></div>
        </div>
      </RoleGate>
    </div>
  );
}

export default function NewProductPage() {
  return <RequireAdminAuth><AdminShell><NewProductContent /></AdminShell></RequireAdminAuth>;
}
