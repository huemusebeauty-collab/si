"use client";
import { useState } from "react";
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminCustomer } from "@/admin/lib/admin-api-client";

function CustomersContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminQuery(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (query) params.set("query", query);
    return adminApi.searchCustomers(params);
  }, [query, page]);

  const columns: Column<AdminCustomer>[] = [
    { header: "Name", render: (c) => <Link href={`/admin/customers/${c.id}`} className="font-semibold text-primary-rose hover:underline">{c.firstName} {c.lastName}</Link> },
    { header: "Email", render: (c) => c.email },
    { header: "Joined", render: (c) => new Date(c.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Customers</h1>
      <div className="max-w-sm">
        <label htmlFor="customer-search" className="sr-only">Search customers</label>
        <input
          id="customer-search"
          type="search"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-sm border border-fog px-3"
        />
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

export default function CustomersPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><CustomersContent /></AdminShell>
    </RequireAdminAuth>
  );
}
