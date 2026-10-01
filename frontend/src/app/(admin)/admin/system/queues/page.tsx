"use client";
import { useEffect, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, DeadLetterJob } from "@/admin/lib/admin-api-client";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Icon } from "@/components/basic/Icon";

function QueueMonitorContent() {
  const { data, isLoading, error: statusError, refetch } = useAdminQuery(() => adminApi.getIntegrationsStatus(), []);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [jobs, setJobs] = useState<DeadLetterJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async (queueName: string) => {
    if (!queueName) {
      setJobs([]);
      return;
    }
    setJobsLoading(true);
    setError(null);
    try {
      setJobs(await adminApi.getDeadLetterJobs(queueName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load failed jobs.");
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedQueue && data?.queues?.[0]?.name) {
      setSelectedQueue(data.queues[0].name);
    }
  }, [data, selectedQueue]);

  useEffect(() => {
    void loadJobs(selectedQueue);
  }, [selectedQueue]);

  const retryJob = async (jobId: string) => {
    setRetryingId(jobId);
    setError(null);
    try {
      await adminApi.retryDeadLetterJob(selectedQueue, jobId);
      await Promise.all([loadJobs(selectedQueue), refetch()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry job.");
    } finally {
      setRetryingId(null);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Icon size={24} label="Queue Monitor"><rect x="4" y="5" width="16" height="4" rx="1" /><rect x="4" y="10" width="16" height="4" rx="1" /><rect x="4" y="15" width="16" height="4" rx="1" /></Icon>
        <h1 className="font-display text-[32px] font-semibold text-ink">Queue Monitor</h1>
      </div>
      <div className="rounded-md bg-white p-6 shadow-rest" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Icon size={20} label=""><circle cx="12" cy="12" r="8" /></Icon>
          <p className="font-semibold text-ink">Loading queue data…</p>
        </div>
        <p className="mt-2 text-[13px] text-stone">Connecting to the queue monitor service. This page will remain visible while data loads.</p>
        <SkeletonLoader className="mt-4 h-3 w-full" />
      </div>
    </div>
  );

  if (statusError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[32px] font-semibold text-ink">Queue Monitor</h1>
          <Button variant="outline" onClick={() => void refetch()}>Retry</Button>
        </div>
        <div className="rounded-md bg-white p-6 shadow-rest">
          <p className="font-semibold text-error">Unable to load queue data.</p>
          <p className="mt-2 text-[13px] text-stone">{statusError}</p>
          <p className="mt-2 text-[13px] text-stone">Please retry. The page will not remain blank when the queue API is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] font-semibold text-ink">Queue Monitor</h1>
        <Button variant="outline" onClick={() => { void refetch(); void loadJobs(selectedQueue); }}>
          Refresh
        </Button>
      </div>

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
            {(data?.queues ?? []).length === 0 && (
              <tr>
                <td className="px-4 py-6 text-stone" colSpan={6}>No queue data was returned by the integration service.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-white p-6 shadow-rest">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Failed / Dead-letter Jobs</h2>
            <p className="text-[13px] text-stone">Inspect exhausted jobs and retry them when appropriate.</p>
          </div>
          <select
            aria-label="Select queue"
            value={selectedQueue}
            onChange={(event) => setSelectedQueue(event.target.value)}
            className="rounded-md border border-fog bg-white px-3 py-2 text-sm"
          >
            {(data?.queues ?? []).map((q) => <option key={q.name} value={q.name}>{q.name}</option>)}
          </select>
        </div>

        {error && <p className="mt-4 text-sm text-error">{error}</p>}
        {jobsLoading ? (
          <SkeletonLoader className="mt-4 h-24 w-full" />
        ) : jobs.length === 0 ? (
          <p className="mt-4 text-[13px] text-stone">No failed jobs in this queue.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-fog text-[12px] uppercase tracking-wide text-stone">
                  <th className="px-3 py-3">Job</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Failure Reason</th>
                  <th className="px-3 py-3">Payload</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id ?? job.name} className="border-b border-fog last:border-0 align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{job.name}</div>
                      <div className="text-[11px] text-stone">{job.id ?? "No job ID"}</div>
                    </td>
                    <td className="px-3 py-3">{job.attemptsMade}</td>
                    <td className="max-w-xs px-3 py-3 break-words text-error">{job.failedReason || "Unknown failure"}</td>
                    <td className="max-w-sm px-3 py-3">
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-[11px] text-stone">
                        {JSON.stringify(job.data, null, 2)}
                      </pre>
                    </td>
                    <td className="px-3 py-3">
                      <RoleGate module="settings" level="edit">
                        <Button
                          variant="outline"
                          disabled={!job.id || retryingId === job.id}
                          onClick={() => job.id && void retryJob(job.id)}
                        >
                          {retryingId === job.id ? "Retrying..." : "Retry"}
                        </Button>
                      </RoleGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[13px] text-stone">
        Failed jobs are retained by BullMQ until manually retried or otherwise cleared. Retry is restricted to admins with settings edit permission.
      </p>
    </div>
  );
}

export default function QueueMonitorPage() {
  return <RequireAdminAuth><AdminShell><QueueMonitorContent /></AdminShell></RequireAdminAuth>;
}
