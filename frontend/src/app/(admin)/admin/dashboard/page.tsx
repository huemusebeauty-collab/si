"use client";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { KpiCard } from "@/admin/components/KpiCard";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { ErrorRecovery } from "@/components/patterns/ErrorRecovery";
import { Alert } from "@/components/composite/Alert";

// Sprint 6B — Dashboard with KPI Widgets (Phase 6 §1), consuming
// GET /v1/admin/dashboard/overview (Sprint 6A) directly — no
// client-side aggregation, per "do not duplicate business logic."
function DashboardContent() {
  const { data, isLoading, error, refetch } = useAdminQuery(() => adminApi.getDashboardOverview(), []);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;
  if (error || !data) return <ErrorRecovery body={error ?? "Could not load the dashboard."} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-[32px] font-semibold text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Today's Orders" value={data.kpis.todaysOrders} />
        <KpiCard label="Today's Revenue" value={`$${data.kpis.todaysRevenue.toFixed(2)}`} />
        <KpiCard label="Low Stock" value={data.kpis.lowStockCount} />
        <KpiCard label="Pending Reviews" value={data.kpis.pendingReviews} />
      </div>

      {data.pendingTasks.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-[20px] font-semibold text-ink">Pending Tasks</h2>
          <div className="flex flex-col gap-2">
            {data.pendingTasks.map((task) => (
              <Alert key={task.type} tone="warning">
                {task.label}
              </Alert>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-[20px] font-semibold text-ink">Recent Activity</h2>
        <ul className="flex flex-col divide-y divide-fog rounded-md bg-white shadow-rest">
          {data.recentActivity.length === 0 && <li className="p-4 text-stone">No recent activity.</li>}
          {data.recentActivity.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between p-4 text-[15px]">
              <span>
                <strong>{entry.actorEmail}</strong> — {entry.action} ({entry.module})
              </span>
              <time className="text-[13px] text-stone">{new Date(entry.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAdminAuth>
      <AdminShell>
        <DashboardContent />
      </AdminShell>
    </RequireAdminAuth>
  );
}
