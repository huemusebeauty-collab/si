"use client";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";

function IntegrationStatusContent() {
  const { data, isLoading, error, refetch } = useAdminQuery(() => adminApi.getIntegrationsStatus(), []);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] font-semibold text-ink">Integration Status</h1>
        <Button variant="outline" onClick={() => void refetch()}>Refresh</Button>
      </div>

      {error ? (
        <div className="rounded-md bg-white p-6 shadow-rest">
          <p className="font-semibold text-error">Unable to load integration status.</p>
          <p className="mt-2 text-[13px] text-stone">{error}</p>
          <p className="mt-2 text-[13px] text-stone">Please retry. The page will not remain blank when the integration API is unavailable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(data?.providers ?? []).map((p) => (
            <div key={p.provider} className="rounded-md bg-white p-6 shadow-rest">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink">{p.provider}</h2>
                <Badge tone={p.circuitState === "closed" ? "success" : p.circuitState === "open" ? "error" : "warning"}>
                  {p.circuitState}
                </Badge>
              </div>
              <p className="mt-2 text-[13px] text-stone">
                Last success: {p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString() : "never"}
              </p>
              <p className="text-[13px] text-stone">
                Last failure: {p.lastFailureAt ? new Date(p.lastFailureAt).toLocaleString() : "never"}
              </p>
              {p.lastError && <p className="mt-2 text-[13px] text-error">{p.lastError}</p>}
            </div>
          ))}
          {(data?.providers ?? []).length === 0 && <p className="text-stone">No provider activity recorded yet.</p>}
        </div>
      )}
    </div>
  );
}

export default function IntegrationStatusPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><IntegrationStatusContent /></AdminShell>
    </RequireAdminAuth>
  );
}
