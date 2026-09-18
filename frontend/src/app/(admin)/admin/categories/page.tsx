"use client";
import { useMemo, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCategory } from "@/admin/lib/admin-api-client";
import { ToggleSwitch } from "@/components/basic/ToggleSwitch";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

function flattenCategories(nodes: AdminCategory[], depth = 0): AdminCategory[] {
  return nodes.flatMap((node) => [
    { ...node, name: `${"— ".repeat(depth)}${node.name}` },
    ...flattenCategories(node.children ?? [], depth + 1),
  ]);
}

function CategoriesContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listAdminCategories(), []);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const rows = useMemo(() => flattenCategories(data ?? []), [data]);
  const parentOptions = useMemo(
    () => flattenCategories(data ?? []).filter((c) => c.id !== editing?.id),
    [data, editing?.id],
  );

  function resetForm() {
    setEditing(null); setName(""); setSlug(""); setParentId(""); setDisplayOrder("0"); setVisible(true);
  }

  function startEdit(category: AdminCategory) {
    setEditing(category);
    setName(category.name.replace(/^— /g, "").trim());
    setSlug(category.slug);
    setParentId(category.parentId ?? "");
    setDisplayOrder(String(category.displayOrder));
    setVisible(category.visible);
    setMessage(null);
  }

  async function saveCategory() {
    setMessage(null);
    if (!name.trim() || !slug.trim()) {
      setMessage({ tone: "error", text: "Name and slug are required." }); return;
    }
    const order = Number(displayOrder);
    if (!Number.isInteger(order) || order < 0) {
      setMessage({ tone: "error", text: "Display order must be a non-negative whole number." }); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, {
          name: name.trim(), slug: slug.trim().toLowerCase(), parentId: parentId || null, displayOrder: order, visible,
        });
        setMessage({ tone: "success", text: "Category updated." });
      } else {
        await adminApi.createCategory({
          name: name.trim(), slug: slug.trim().toLowerCase(), parentId: parentId || null, displayOrder: order, visible,
        });
        setMessage({ tone: "success", text: "Category created." });
      }
      resetForm();
      await refetch();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Unable to save category." });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<AdminCategory>[] = [
    { header: "Name", render: (c) => <span className="font-semibold text-ink">{c.name}</span> },
    { header: "Slug", render: (c) => c.slug },
    { header: "Display Order", render: (c) => c.displayOrder },
    {
      header: "Visible",
      render: (c) => (
        <RoleGate module="categories" level="edit" fallback={<span>{c.visible ? "Yes" : "No"}</span>}>
          <ToggleSwitch label="" checked={c.visible} onChange={async (next) => { await adminApi.setCategoryVisibility(c.id, next); refetch(); }} />
        </RoleGate>
      ),
    },
    {
      header: "Actions",
      render: (c) => (
        <RoleGate module="categories" level="edit">
          <Button variant="text" onClick={() => startEdit(c)}>Edit</Button>
        </RoleGate>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Categories</h1>
        <p className="max-w-3xl text-[13px] text-stone">
          Categories are now managed from Admin. You can create future categories/subcategories, change their parent,
          order and visibility without a code deployment.
        </p>
      </div>

      <RoleGate module="categories" level="edit" fallback={null}>
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{editing ? "Edit Category" : "Add Category"}</h2>
              <p className="text-xs text-muted">Keep the hierarchy simple; use attributes/filters for finer product traits.</p>
            </div>
            {editing && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
          {message && <div className="mb-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold">Name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Face Wash" /></label>
            <label className="text-sm font-semibold">Slug<input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="face-wash" /></label>
            <label className="text-sm font-semibold">Parent category<select className={inputClass} value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Top level</option>{parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Display order<input className={inputClass} type="number" min="0" step="1" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} /></label>
            <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Visible on storefront</label>
            <div className="lg:col-span-4"><Button variant="primary" disabled={saving} onClick={saveCategory}>{saving ? "Saving..." : editing ? "Update Category" : "Create Category"}</Button></div>
          </div>
        </div>
      </RoleGate>

      <DataTable columns={columns} rows={rows} isLoading={isLoading} emptyMessage="No categories found." />
    </div>
  );
}

export default function CategoriesPage() {
  return <RequireAdminAuth><AdminShell><CategoriesContent /></AdminShell></RequireAdminAuth>;
}
