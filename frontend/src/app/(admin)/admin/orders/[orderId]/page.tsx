"use client";
import { useState } from "react";
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

const STATUS_OPTIONS = ["pending_payment", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

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
        <p><strong>Total:</strong> ${order.total} {order.currency}</p>
        <p><strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <RoleGate module="orders" level="edit">
        <div className="rounded-md bg-white p-6 shadow-rest">
          <h2 className="mb-3 font-semibold text-ink">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={s === order.status ? "primary" : "outline"}
                onClick={async () => {
                  await adminApi.updateOrderStatus(order.id, s);
                  setToast(`Status updated to "${s}".`);
                  refetch();
                }}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </RoleGate>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  return (
    <RequireAdminAuth>
      <AdminShell><OrderDetailContent orderId={orderId} /></AdminShell>
    </RequireAdminAuth>
  );
}
