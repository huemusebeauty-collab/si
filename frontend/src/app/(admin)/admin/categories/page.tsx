"use client";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCategory } from "@/admin/lib/admin-api-client";
import { ToggleSwitch } from "@/components/basic/ToggleSwitch";

function CategoriesContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listCategories(), []);

  const columns: Column<AdminCategory>[] = [
    { header: "Name", render: (c) => <span className="font-semibold text-ink">{c.name}</span> },
    { header: "Slug", render: (c) => c.slug },
    { header: "Display Order", render: (c) => c.displayOrder },
    {
      header: "Visible",
      render: (c) => (
        <RoleGate module="categories" level="edit" fallback={<span>{c.visible ? "Yes" : "No"}</span>}>
          <ToggleSwitch
            label=""
            checked={c.visible}
            onChange={async (visible) => {
              await adminApi.setCategoryVisibility(c.id, visible);
              refetch();
            }}
          />
        </RoleGate>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Categories</h1>
      <p className="max-w-2xl text-[13px] text-stone">
        The five main categories are fixed per Phase 0/1 and cannot be added or removed here — only visibility and
        display order are managed.
      </p>
      <DataTable columns={columns} rows={data ?? []} isLoading={isLoading} emptyMessage="No categories found." />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><CategoriesContent /></AdminShell>
    </RequireAdminAuth>
  );
}
