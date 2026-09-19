"use client";
import { use, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { ErrorRecovery } from "@/components/patterns/ErrorRecovery";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["confirmed", "payment_failed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  payment_failed: ["pending_payment", "cancelled"],
  cancelled: [],
  returned: [],
};

function OrderDetailContent({ orderId }: { orderId: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const { data: order, isLoading, error, refetch } = useAdminQuery(() => adminApi.getOrder(orderId), [orderId]);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;
  if (error || !order) return <ErrorRecovery body={error ?? "Order not found."} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Orders", href: "/admin/orders" }, { label: order.id.slice(0, 8) }]} />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-semibold text-ink">Order {order.id.slice(0, 8)}</h1>
        <Badge tone="information">{order.status}</Badge>
      </div>
      <div className="rounded-md bg-white p-6 shadow-rest">
        <p><strong>Customer:</strong> {order.customerId}</p>
        <p><strong>Total:</strong> ₹{order.total} {order.currency}</p>
        <p><strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}</p>
      </div>
      <RoleGate module="orders" level="edit">
        <div className="rounded-md bg-white p-6 shadow-rest">
          <h2 className="mb-3 font-semibold text-ink">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {(VALID_TRANSITIONS[order.status] ?? []).map((s) => (
              <Button
                key={s}
                variant="outline"
                onClick={async () => {
                  try {
                    await adminApi.updateOrderStatus(order.id, s);
                    setToast(`Status updated to "${s}".`);
                    refetch();
                  } catch (error) {
                    setToast(error instanceof Error ? error.message : "Unable to update order status.");
                  }
                }}
              >{s}</Button>
            ))}
            {(VALID_TRANSITIONS[order.status] ?? []).length === 0 && (
              <p className="text-sm text-muted">No valid status transitions from this state.</p>
            )}
          </div>
        </div>
      </RoleGate>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  return (
    <RequireAdminAuth>
      <AdminShell><OrderDetailContent orderId={orderId} /></AdminShell>
    </RequireAdminAuth>
  );
}
