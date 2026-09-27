"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCollection } from "@/admin/lib/admin-api-client";
import { ToggleSwitch } from "@/components/basic/ToggleSwitch";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

function CollectionsContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listAdminCollections(), []);
  const [editing, setEditing] = useState<AdminCollection | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function resetForm() {
    setEditing(null); setName(""); setSlug(""); setTagline(""); setDisplayOrder("0"); setActive(true);
    setFeatured(false); setMetaTitle(""); setMetaDescription(""); setStartAt(""); setEndAt(""); setMessage(null);
  }

  function startEdit(c: AdminCollection) {
    setEditing(c); setName(c.name); setSlug(c.slug); setTagline(c.tagline ?? "");
    setDisplayOrder(String(c.displayOrder)); setActive(c.active); setFeatured(c.featured);
    setMetaTitle(c.metaTitle ?? ""); setMetaDescription(c.metaDescription ?? "");
    setStartAt(c.startAt ? c.startAt.slice(0, 16) : ""); setEndAt(c.endAt ? c.endAt.slice(0, 16) : "");
    setMessage(null);
  }

  async function saveCollection() {
    setMessage(null);
    if (!name.trim() || !slug.trim()) return setMessage({ tone: "error", text: "Name and slug are required." });
    const order = Number(displayOrder);
    if (!Number.isInteger(order) || order < 0) return setMessage({ tone: "error", text: "Display order must be a non-negative whole number." });
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) return setMessage({ tone: "error", text: "End date cannot be before start date." });
    setSaving(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim().toLowerCase(), tagline: tagline.trim(), displayOrder: order,
        active, featured, metaTitle: metaTitle.trim() || undefined, metaDescription: metaDescription.trim() || undefined,
        startAt: startAt ? new Date(startAt).toISOString() : undefined, endAt: endAt ? new Date(endAt).toISOString() : undefined,
      };
      if (editing) await adminApi.updateCollection(editing.id, body);
      else await adminApi.createCollection(body);
      setMessage({ tone: "success", text: editing ? "Collection updated." : "Collection created." });
      resetForm();
      await refetch();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Unable to save collection." });
    } finally { setSaving(false); }
  }

  async function removeCollection(c: AdminCollection) {
    if (!window.confirm(`Delete collection "${c.name}"? This removes the collection, not the products.`)) return;
    try { await adminApi.deleteCollection(c.id); await refetch(); setMessage({ tone: "success", text: "Collection deleted." }); }
    catch (e) { setMessage({ tone: "error", text: e instanceof Error ? e.message : "Unable to delete collection." }); }
  }

  const columns: Column<AdminCollection>[] = [
    { header: "Name", render: (c) => <span className="font-semibold text-ink">{c.name}</span> },
    { header: "Slug", render: (c) => c.slug },
    { header: "Status", render: (c) => <Badge tone={c.active ? "success" : "error"}>{c.active ? "Active" : "Inactive"}</Badge> },
    { header: "Products", render: (c) => c.products?.length ?? 0 },
    {
      header: "Active",
      render: (c) => <RoleGate module="categories" level="edit" fallback={<span>{c.active ? "Yes" : "No"}</span>}>
        <ToggleSwitch label="" checked={c.active} onChange={async (next) => { await adminApi.setCollectionActive(c.id, next); refetch(); }} />
      </RoleGate>,
    },
    {
      header: "Featured",
      render: (c) => <RoleGate module="categories" level="edit" fallback={<span>{c.featured ? "Yes" : "No"}</span>}>
        <ToggleSwitch label="" checked={c.featured} onChange={async (next) => { await adminApi.setCollectionFeatured(c.id, next); refetch(); }} />
      </RoleGate>,
    },
    { header: "Display Order", render: (c) => c.displayOrder },
    {
      header: "Actions",
      render: (c) => <RoleGate module="categories" level="edit">
        <div className="flex gap-2"><Button variant="text" onClick={() => startEdit(c)}>Edit</Button><Button variant="text" onClick={() => removeCollection(c)}>Delete</Button></div>
      </RoleGate>,
    },
  ];

  return <div className="flex flex-col gap-6">
    <div><h1 className="font-display text-[32px] font-semibold text-ink">Collections</h1><p className="max-w-3xl text-[13px] text-stone">Create, edit, activate, feature and order storefront collections from Admin.</p></div>
    <RoleGate module="categories" level="edit" fallback={null}>
      <div className="rounded-xl border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-ink">{editing ? "Edit Collection" : "Add Collection"}</h2><p className="text-xs text-muted">Products already assigned to a collection are preserved when you edit or delete the collection.</p></div>
          {editing && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
        </div>
        {message && <div className="mb-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold">Name<input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Spring Muse" /></label>
          <label className="text-sm font-semibold">Slug<input className={inputClass} value={slug} onChange={e => setSlug(e.target.value)} placeholder="spring-muse" /></label>
          <label className="text-sm font-semibold lg:col-span-2">Tagline<input className={inputClass} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Seasonal favourites" /></label>
          <label className="text-sm font-semibold">Display order<input className={inputClass} type="number" min="0" step="1" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} /></label>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Featured</label>
          <label className="text-sm font-semibold">Start date<input className={inputClass} type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} /></label>
          <label className="text-sm font-semibold">End date<input className={inputClass} type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} /></label>
          <label className="text-sm font-semibold lg:col-span-2">Meta title<input className={inputClass} value={metaTitle} onChange={e => setMetaTitle(e.target.value)} /></label>
          <label className="text-sm font-semibold lg:col-span-2">Meta description<textarea className={inputClass} rows={2} value={metaDescription} onChange={e => setMetaDescription(e.target.value)} /></label>
          <div className="lg:col-span-4"><Button variant="primary" disabled={saving} onClick={saveCollection}>{saving ? "Saving..." : editing ? "Update Collection" : "Create Collection"}</Button></div>
        </div>
      </div>
    </RoleGate>
    <DataTable columns={columns} rows={data ?? []} isLoading={isLoading} emptyMessage="No collections found." />
  </div>;
}

export default function CollectionsPage() {
  return <RequireAdminAuth><AdminShell><CollectionsContent /></AdminShell></RequireAdminAuth>;
}
