"use client";
import { useState } from "react";
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminOrder } from "@/admin/lib/admin-api-client";
import { Badge } from "@/components/basic/Badge";
import { Input } from "@/components/basic/Input";

// Sprint 6B — Order Management: search/filter (Phase 6 §14).
function OrdersContent() {
  const [status, setStatus] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminQuery(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    if (customerQuery) params.set("customerQuery", customerQuery);
    return adminApi.listOrders(params);
  }, [status, customerQuery, page]);

  const columns: Column<AdminOrder>[] = [
    { header: "Order", render: (o) => <Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary-rose hover:underline">{o.id.slice(0, 8)}</Link> },
    { header: "Customer", render: (o) => o.customerId.slice(0, 8) },
    { header: "Total", render: (o) => `$${o.total}` },
    { header: "Status", render: (o) => <Badge tone="information">{o.status}</Badge> },
    { header: "Date", render: (o) => new Date(o.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Orders</h1>
      <div className="flex flex-wrap gap-4">
        <Input label="Search by customer" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label htmlFor="order-status" className="text-[12px] font-semibold uppercase tracking-wide text-charcoal">Status</label>
          <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-sm border border-fog px-3">
            <option value="">All</option>
            {["pending_payment", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={Math.max(1, Math.ceil((data?.totalItems ?? 0) / 20))}
        onPageChange={setPage}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><OrdersContent /></AdminShell>
    </RequireAdminAuth>
  );
}
