"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminReview } from "@/admin/lib/admin-api-client";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";
import { StarRating } from "@/components/composite/ReviewCard";

function ReviewsContent() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminQuery(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    return adminApi.listReviews(params);
  }, [status, page]);

  const columns: Column<AdminReview>[] = [
    { header: "Rating", render: (r) => <StarRating rating={r.rating} /> },
    { header: "Text", render: (r) => <span className="line-clamp-2 max-w-xs">{r.text}</span> },
    { header: "Status", render: (r) => <Badge tone={r.status === "approved" ? "success" : r.status === "hidden" ? "error" : "warning"}>{r.status}</Badge> },
    { header: "Date", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      header: "Actions",
      render: (r) => (
        <RoleGate module="reviews" level="edit">
          <div className="flex gap-2">
            {r.status !== "approved" && (
              <Button variant="text" onClick={async () => { await adminApi.approveReview(r.id); setToast("Review approved."); refetch(); }}>Approve</Button>
            )}
            {r.status !== "hidden" && (
              <Button variant="text" onClick={async () => { await adminApi.hideReview(r.id); setToast("Review hidden."); refetch(); }}>Hide</Button>
            )}
          </div>
        </RoleGate>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-semibold text-ink">Review Moderation</h1>
        <RoleGate module="reviews" level="edit">
          <Button
            variant="outline"
            disabled={selected.size === 0}
            onClick={async () => {
              await adminApi.bulkApproveReviews(Array.from(selected));
              setToast(`Approved ${selected.size} review(s).`);
              setSelected(new Set());
              refetch();
            }}
          >
            Bulk Approve ({selected.size})
          </Button>
        </RoleGate>
      </div>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-48 rounded-sm border border-fog px-3">
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="hidden">Hidden</option>
        <option value="">All</option>
      </select>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={Math.max(1, Math.ceil((data?.totalItems ?? 0) / 20))}
        onPageChange={setPage}
        selectable
        selectedIds={selected}
        onToggleSelect={(id) => {
          const next = new Set(selected);
          next.has(id) ? next.delete(id) : next.add(id);
          setSelected(next);
        }}
      />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><ReviewsContent /></AdminShell>
    </RequireAdminAuth>
  );
}
