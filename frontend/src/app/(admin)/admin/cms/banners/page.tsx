"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import type { AdminBanner } from "@/admin/lib/admin-api-client";

function BannersContent() {
  const [placement, setPlacement] = useState("homepage-hero");
  const [headline, setHeadline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listBanners(placement), [placement]);

  const cols: Column<AdminBanner>[] = [
    { header: "Headline", render: (b) => b.headline ?? "—" },
    { header: "Placement", render: (b) => b.placement },
    { header: "Active Window", render: (b) => `${new Date(b.startAt).toLocaleDateString()} – ${new Date(b.endAt).toLocaleDateString()}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Banners</h1>
      <Input label="Placement" value={placement} onChange={(e) => setPlacement(e.target.value)} />
      <DataTable columns={cols} rows={data ?? []} isLoading={isLoading} emptyMessage="No active banners for this placement." />
      <RoleGate module="content" level="full">
        <div className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-semibold text-ink">New Banner</h2>
          <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Button
            variant="primary"
            className="w-fit"
            onClick={async () => {
              const now = new Date();
              const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              await adminApi.createBanner({ placement, headline, imageUrl, startAt: now.toISOString(), endAt: inAWeek.toISOString() });
              refetch();
            }}
          >
            Create Banner (7-day default window)
          </Button>
        </div>
      </RoleGate>
    </div>
  );
}

export default function BannersPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><BannersContent /></AdminShell>
    </RequireAdminAuth>
  );
}
