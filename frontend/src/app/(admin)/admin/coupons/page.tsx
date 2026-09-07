"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCoupon } from "@/admin/lib/admin-api-client";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { ToggleSwitch } from "@/components/basic/ToggleSwitch";

function CouponsContent() {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listCoupons(new URLSearchParams()), []);

  const columns: Column<AdminCoupon>[] = [
    { header: "Code", render: (c) => <span className="font-semibold">{c.code}</span> },
    { header: "Discount", render: (c) => (c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue}`) },
    { header: "Redeemed", render: (c) => c.timesRedeemed },
    { header: "Active", render: (c) => <Badge tone={c.active ? "success" : "error"}>{c.active ? "Active" : "Inactive"}</Badge> },
    {
      header: "Toggle",
      render: (c) => (
        <RoleGate module="coupons" level="full">
          <ToggleSwitch label="" checked={c.active} onChange={async (active) => { await adminApi.setCouponActive(c.id, active); refetch(); }} />
        </RoleGate>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Coupons & Promotions</h1>
      <DataTable columns={columns} rows={data?.items ?? []} isLoading={isLoading} emptyMessage="No coupons yet." />
      <RoleGate module="coupons" level="full">
        <div className="flex flex-wrap items-end gap-4 rounded-md bg-white p-6 shadow-rest">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Input label="Percentage Off" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button
            variant="primary"
            onClick={async () => {
              const now = new Date();
              const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
              await adminApi.createCoupon({
                code, discountType: "percentage", discountValue: Number(value),
                startAt: now.toISOString(), endAt: in30Days.toISOString(),
              });
              setCode("");
              refetch();
            }}
          >
            Create Coupon (30-day default window)
          </Button>
        </div>
      </RoleGate>
    </div>
  );
}

export default function CouponsPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><CouponsContent /></AdminShell>
    </RequireAdminAuth>
  );
}
