"use client";
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { ErrorRecovery } from "@/components/patterns/ErrorRecovery";
import { Badge } from "@/components/basic/Badge";

function CustomerDetailContent({ customerId }: { customerId: string }) {
  const { data: customer, isLoading, error, refetch } = useAdminQuery(() => adminApi.getCustomer(customerId), [customerId]);
  const { data: orders } = useAdminQuery(() => adminApi.getCustomerOrders(customerId), [customerId]);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;
  if (error || !customer) return <ErrorRecovery body={error ?? "Customer not found."} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Customers", href: "/admin/customers" }, { label: `${customer.firstName} ${customer.lastName}` }]} />
      <h1 className="font-display text-[32px] font-semibold text-ink">{customer.firstName} {customer.lastName}</h1>
      <div className="rounded-md bg-white p-6 shadow-rest">
        <p><strong>Email:</strong> {customer.email}</p>
        <p><strong>Joined:</strong> {new Date(customer.createdAt).toLocaleDateString()}</p>
      </div>
      <section>
        <h2 className="mb-3 font-semibold text-ink">Order History</h2>
        <ul className="flex flex-col divide-y divide-fog rounded-md bg-white shadow-rest">
          {(orders ?? []).length === 0 && <li className="p-4 text-stone">No orders yet.</li>}
          {(orders ?? []).map((o) => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <Link href={`/admin/orders/${o.id}`} className="text-primary-rose hover:underline">{o.id.slice(0, 8)}</Link>
              <span>${o.total}</span>
              <Badge tone="information">{o.status}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  const { customerId } = params;
  return (
    <RequireAdminAuth>
      <AdminShell><CustomerDetailContent customerId={customerId} /></AdminShell>
    </RequireAdminAuth>
  );
}
