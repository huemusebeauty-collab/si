"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AuditLogEntry } from "@/admin/lib/admin-api-client";

function AuditLogContent() {
  const [module, setModule] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminQuery(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (module) params.set("module", module);
    return adminApi.listAuditLogs(params);
  }, [module, page]);

  const columns: Column<AuditLogEntry>[] = [
    { header: "Actor", render: (e) => e.actorEmail },
    { header: "Module", render: (e) => e.module },
    { header: "Action", render: (e) => e.action },
    { header: "Entity", render: (e) => e.entityId?.slice(0, 8) ?? "—" },
    { header: "When", render: (e) => new Date(e.createdAt).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Audit Log</h1>
      <select value={module} onChange={(e) => setModule(e.target.value)} className="h-11 w-48 rounded-sm border border-fog px-3">
        <option value="">All modules</option>
        {["auth", "products", "orders", "content", "coupons", "reviews"].map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><AuditLogContent /></AdminShell>
    </RequireAdminAuth>
  );
}
