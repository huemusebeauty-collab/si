"use client";

import { useEffect, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, type AdminShipment, type LogisticsDashboard, type ShipmentEvent, type LogisticsEligibleOrder } from "@/admin/lib/admin-api-client";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

const VALID_NEXT_STATUSES: Record<string, string[]> = {
  draft: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["pickup_scheduled", "picked_up", "cancelled"],
  pickup_scheduled: ["picked_up", "delivery_failed", "cancelled"],
  picked_up: ["in_transit", "delivery_failed", "rto"],
  in_transit: ["out_for_delivery", "delivery_failed", "rto"],
  out_for_delivery: ["delivered", "delivery_failed", "rto"],
  delivered: ["return_requested"],
  delivery_failed: ["pickup_scheduled", "rto"],
  rto: ["returned"],
  return_requested: ["return_in_transit", "cancelled"],
  return_in_transit: ["returned", "delivery_failed"],
  returned: [],
  cancelled: [],
};
const STATUSES = Object.keys(VALID_NEXT_STATUSES).filter((value) => value !== "draft");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function LogisticsContent() {
  const [dashboard, setDashboard] = useState<LogisticsDashboard | null>(null);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState("");
  const [eligibleOrders, setEligibleOrders] = useState<LogisticsEligibleOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [carrier, setCarrier] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<AdminShipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<ShipmentEvent[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailAwb, setDetailAwb] = useState("");
  const [detailTrackingUrl, setDetailTrackingUrl] = useState("");
  const [detailLocation, setDetailLocation] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailFailureReason, setDetailFailureReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [nextDashboard, nextShipments, nextOrders] = await Promise.all([
        adminApi.getLogisticsDashboard(),
        adminApi.listShipments(status || undefined),
        adminApi.listLogisticsEligibleOrders(),
      ]);
      setDashboard(nextDashboard);
      setShipments(nextShipments);
      setEligibleOrders(nextOrders);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to load logistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [status]);

  const openDetails = async (shipment: AdminShipment) => {
    setSelectedShipment(shipment);
    setDetailAwb(shipment.awbNumber ?? "");
    setDetailTrackingUrl(shipment.trackingUrl ?? "");
    setDetailFailureReason(shipment.failureReason ?? "");
    setDetailLocation("");
    setDetailDescription("");
    setDetailsLoading(true);
    try {
      setTrackingEvents(await adminApi.getShipmentTracking(shipment.id));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to load tracking.");
      setTrackingEvents([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveDetails = async () => {
    if (!selectedShipment) return;
    setDetailsSaving(true);
    try {
      const updated = await adminApi.updateShipmentStatus(selectedShipment.id, {
        status: selectedShipment.status,
        awbNumber: detailAwb.trim() || undefined,
        trackingUrl: detailTrackingUrl.trim() || undefined,
        location: detailLocation.trim() || undefined,
        description: detailDescription.trim() || undefined,
        failureReason: detailFailureReason.trim() || undefined,
      });
      setSelectedShipment(updated);
      setToast("Shipment details updated.");
      await load();
      setTrackingEvents(await adminApi.getShipmentTracking(updated.id));
      setDetailLocation("");
      setDetailDescription("");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update shipment details.");
    } finally {
      setDetailsSaving(false);
    }
  };

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

      <RoleGate module="logistics" level="edit">
        <div className="grid gap-3 rounded-md bg-white p-4 shadow-rest md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="space-y-2"><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search customer / Order ID" className="w-full rounded-md border border-line px-3 py-2 text-sm" /><select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm" aria-describedby="logistics-order-id-help"><option value="">Select confirmed / processing order</option>{eligibleOrders.filter((order) => { const q = orderSearch.trim().toLowerCase(); return !q || order.id.toLowerCase().includes(q) || (order.customerLegalName ?? "").toLowerCase().includes(q); }).map((order) => <option key={order.id} value={order.id}>{order.customerLegalName ? `${order.customerLegalName} · ` : ""}{order.id} · ₹{order.total}</option>)}</select><p id="logistics-order-id-help" className="text-xs text-ink-muted">Only confirmed/processing orders are listed; the full UUID is selected automatically.</p></div>
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Courier / carrier" className="rounded-md border border-line px-3 py-2 text-sm" />
          <input value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} placeholder="Service level" className="rounded-md border border-line px-3 py-2 text-sm" />
          <Button variant="primary" disabled={creating || !UUID_RE.test(orderId.trim())} onClick={async () => {
            setCreating(true);
            try {
              await adminApi.createShipment({ orderId: orderId.trim(), carrier: carrier.trim() || undefined, serviceLevel: serviceLevel.trim() || undefined });
              setOrderId(""); setCarrier(""); setServiceLevel(""); setToast("Shipment created."); await load();
            } catch (error) {
              setToast(error instanceof Error ? error.message : "Unable to create shipment.");
            } finally { setCreating(false); }
          }}>{creating ? "Creating..." : "Create Shipment"}</Button>
        </div>
      </RoleGate>

      <div className="flex flex-wrap gap-2">
        <Button variant={status === "" ? "primary" : "outline"} onClick={() => setStatus("")}>All</Button>
        {STATUSES.map((item) => <Button key={item} variant={status === item ? "primary" : "outline"} onClick={() => setStatus(item)}>{item}</Button>)}
      </div>

      <div className="overflow-x-auto rounded-md bg-white shadow-rest">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-4">Order</th><th className="p-4">Courier</th><th className="p-4">AWB</th><th className="p-4">Status</th><th className="p-4">Updated</th><th className="p-4">Details</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-4" colSpan={6}>Loading…</td></tr> : shipments.length === 0 ? <tr><td className="p-4" colSpan={6}>No shipments found.</td></tr> : shipments.map((shipment) => (
              <tr key={shipment.id} className="border-b last:border-0">
                <td className="p-4 font-medium">{shipment.orderId.slice(0, 8)}</td>
                <td className="p-4">{shipment.carrier ?? "—"}</td>
                <td className="p-4">{shipment.awbNumber ?? "—"}</td>
                <td className="p-4">
                  <Badge tone={shipment.status === "delivered" ? "success" : shipment.status === "delivery_failed" || shipment.status === "rto" ? "warning" : "information"}>{shipment.status}</Badge>
                  <RoleGate module="logistics" level="edit">
                    <div className="mt-2 flex items-center gap-2">
                      <select defaultValue={shipment.status} id={`shipment-status-${shipment.id}`} className="rounded-md border border-line px-2 py-1 text-xs">
                        <option value={shipment.status}>{shipment.status}</option>
                        {(VALID_NEXT_STATUSES[shipment.status] ?? []).map((next) => <option key={next} value={next}>{next}</option>)}
                      </select>
                      <Button variant="text" disabled={updatingId === shipment.id} onClick={async () => {
                        const select = document.getElementById(`shipment-status-${shipment.id}`) as HTMLSelectElement | null;
                        const nextStatus = select?.value ?? shipment.status;
                        setUpdatingId(shipment.id);
                        try { await adminApi.updateShipmentStatus(shipment.id, { status: nextStatus }); setToast("Shipment status updated."); await load(); }
                        catch (error) { setToast(error instanceof Error ? error.message : "Unable to update shipment."); }
                        finally { setUpdatingId(null); }
                      }}>{updatingId === shipment.id ? "Saving..." : "Update"}</Button>
                    </div>
                  </RoleGate>
                </td>
                <td className="p-4">{new Date(shipment.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Shipment details">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-rest">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-ink">Shipment Details</h2><p className="text-sm text-ink-muted">Order {selectedShipment.orderId}</p></div><Button variant="outline" onClick={() => setSelectedShipment(null)}>Close</Button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div><p className="text-xs text-ink-muted">Status</p><p className="font-medium">{selectedShipment.status}</p></div>
              <div><p className="text-xs text-ink-muted">Courier / Service</p><p className="font-medium">{selectedShipment.carrier ?? "—"} {selectedShipment.serviceLevel ? `· ${selectedShipment.serviceLevel}` : ""}</p></div>
              <label className="text-sm">AWB Number<input value={detailAwb} onChange={e => setDetailAwb(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2" /></label>
              <label className="text-sm">Tracking URL<input value={detailTrackingUrl} onChange={e => setDetailTrackingUrl(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2" /></label>
              <label className="text-sm">Event Location<input value={detailLocation} onChange={e => setDetailLocation(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-md border border-line px-3 py-2" /></label>
              <label className="text-sm">Failure Reason<input value={detailFailureReason} onChange={e => setDetailFailureReason(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2" /></label>
            </div>
            <label className="mt-3 block text-sm">Event Description<textarea value={detailDescription} onChange={e => setDetailDescription(e.target.value)} placeholder="Optional tracking note" className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2" /></label>
            <RoleGate module="logistics" level="edit"><div className="mt-3 flex justify-end"><Button variant="primary" disabled={detailsSaving} onClick={() => void saveDetails()}>{detailsSaving ? "Saving..." : "Save Details"}</Button></div></RoleGate>
            <div className="mt-6"><h3 className="font-semibold text-ink">Tracking Timeline</h3>{detailsLoading ? <p className="mt-2 text-sm text-ink-muted">Loading tracking…</p> : trackingEvents.length === 0 ? <p className="mt-2 text-sm text-ink-muted">No tracking events yet.</p> : <div className="mt-3 space-y-3">{trackingEvents.map(event => <div key={event.id} className="rounded-md border border-line p-3"><div className="flex justify-between gap-2"><span className="font-medium">{event.status}</span><span className="text-xs text-ink-muted">{new Date(event.eventAt).toLocaleString()}</span></div>{event.location && <p className="text-sm text-ink-muted">Location: {event.location}</p>}{event.description && <p className="mt-1 text-sm">{event.description}</p>}</div>)}</div>}</div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function LogisticsPage() {
  return <RequireAdminAuth><AdminShell><RoleGate module="logistics" level="view"><LogisticsContent /></RoleGate></AdminShell></RequireAdminAuth>;
}
