"use client";

import { useEffect, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, type AdminShipment, type LogisticsDashboard } from "@/admin/lib/admin-api-client";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

const STATUSES = ["ready_to_ship","pickup_scheduled","picked_up","in_transit","out_for_delivery","delivered","delivery_failed","rto","return_requested","return_in_transit","returned","cancelled"];

function LogisticsContent() {
  const [dashboard, setDashboard] = useState<LogisticsDashboard | null>(null);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [nextDashboard, nextShipments] = await Promise.all([
        adminApi.getLogisticsDashboard(),
        adminApi.listShipments(status || undefined),
      ]);
      setDashboard(nextDashboard);
      setShipments(nextShipments);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to load logistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Logistics" }]} />
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Logistics</h1>
        <p className="text-sm text-ink-muted">Shipment, courier, tracking, delivery, RTO and return operations.</p>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-md bg-white p-4 shadow-rest"><p className="text-xs text-ink-muted">Total Shipments</p><p className="text-2xl font-semibold">{dashboard.total}</p></div>
          <div className="rounded-md bg-white p-4 shadow-rest"><p className="text-xs text-ink-muted">In Transit</p><p className="text-2xl font-semibold">{dashboard.counts.in_transit ?? 0}</p></div>
          <div className="rounded-md bg-white p-4 shadow-rest"><p className="text-xs text-ink-muted">Out for Delivery</p><p className="text-2xl font-semibold">{dashboard.counts.out_for_delivery ?? 0}</p></div>
          <div className="rounded-md bg-white p-4 shadow-rest"><p className="text-xs text-ink-muted">Exceptions</p><p className="text-2xl font-semibold">{dashboard.exceptions}</p></div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={status === "" ? "primary" : "outline"} onClick={() => setStatus("")}>All</Button>
        {STATUSES.map((item) => <Button key={item} variant={status === item ? "primary" : "outline"} onClick={() => setStatus(item)}>{item}</Button>)}
      </div>

      <div className="overflow-x-auto rounded-md bg-white shadow-rest">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-4">Order</th><th className="p-4">Courier</th><th className="p-4">AWB</th><th className="p-4">Status</th><th className="p-4">Updated</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-4" colSpan={5}>Loading…</td></tr> : shipments.length === 0 ? <tr><td className="p-4" colSpan={5}>No shipments found.</td></tr> : shipments.map((shipment) => (
              <tr key={shipment.id} className="border-b last:border-0">
                <td className="p-4 font-medium">{shipment.orderId.slice(0, 8)}</td>
                <td className="p-4">{shipment.carrier ?? "—"}</td>
                <td className="p-4">{shipment.awbNumber ?? "—"}</td>
                <td className="p-4"><Badge tone={shipment.status === "delivered" ? "success" : shipment.status === "delivery_failed" || shipment.status === "rto" ? "warning" : "information"}>{shipment.status}</Badge></td>
                <td className="p-4">{new Date(shipment.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function LogisticsPage() {
  return <RequireAdminAuth><AdminShell><RoleGate module="logistics" level="view"><LogisticsContent /></RoleGate></AdminShell></RequireAdminAuth>;
}
