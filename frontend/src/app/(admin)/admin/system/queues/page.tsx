"use client";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { Badge } from "@/components/basic/Badge";

// Sprint 6B — Queue Monitor, consuming Sprint 5.11's
// GET /v1/integrations/status (which includes queue stats).
function QueueMonitorContent() {
  const { data, isLoading } = useAdminQuery(() => adminApi.getIntegrationsStatus(), []);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Queue Monitor</h1>
      <div className="overflow-x-auto rounded-md bg-white shadow-rest">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-fog text-[12px] uppercase tracking-wide text-stone">
              <th className="px-4 py-3">Queue</th>
              <th className="px-4 py-3">Waiting</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Delayed</th>
            </tr>
          </thead>
          <tbody>
            {(data?.queues ?? []).map((q) => (
              <tr key={q.name} className="border-b border-fog last:border-0">
                <td className="px-4 py-3 font-semibold">{q.name}</td>
                <td className="px-4 py-3">{q.waiting}</td>
                <td className="px-4 py-3">{q.active}</td>
                <td className="px-4 py-3">{q.completed}</td>
                <td className="px-4 py-3">{q.failed > 0 ? <Badge tone="error">{q.failed}</Badge> : q.failed}</td>
                <td className="px-4 py-3">{q.delayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-stone">
        Failed jobs are inspectable via the backend's dead-letter endpoint
        (<code>GET /v1/integrations/dead-letter/:queueName</code>) — a dedicated UI for browsing individual
        dead-lettered jobs was not built this sprint (see Known Issues).
      </p>
    </div>
  );
}

export default function QueueMonitorPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><QueueMonitorContent /></AdminShell>
    </RequireAdminAuth>
  );
}
