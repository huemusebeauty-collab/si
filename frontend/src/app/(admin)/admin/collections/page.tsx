"use client";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCollection } from "@/admin/lib/admin-api-client";
import { ToggleSwitch } from "@/components/basic/ToggleSwitch";
import { Badge } from "@/components/basic/Badge";

function CollectionsContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listCollections(), []);

  const columns: Column<AdminCollection>[] = [
    { header: "Name", render: (c) => <span className="font-semibold text-ink">{c.name}</span> },
    { header: "Status", render: (c) => <Badge tone={c.active ? "success" : "error"}>{c.active ? "Active" : "Inactive"}</Badge> },
    {
      header: "Featured",
      render: (c) => (
        <RoleGate module="categories" level="edit" fallback={<span>{c.featured ? "Yes" : "No"}</span>}>
          <ToggleSwitch
            label=""
            checked={c.featured}
            onChange={async (featured) => {
              await adminApi.setCollectionFeatured(c.id, featured);
              refetch();
            }}
          />
        </RoleGate>
      ),
    },
    { header: "Display Order", render: (c) => c.displayOrder },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Collections</h1>
      <DataTable columns={columns} rows={data ?? []} isLoading={isLoading} emptyMessage="No collections found." />
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><CollectionsContent /></AdminShell>
    </RequireAdminAuth>
  );
}
