"use client";
import { useMemo, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { Tabs } from "@/components/composite/Tabs";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { KpiCard } from "@/admin/components/KpiCard";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";

function SalesReport({ params }: { params: URLSearchParams }) {
  const { data, isLoading } = useAdminQuery(() => adminApi.getSalesSummary(params), [params.toString()]);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard label="Orders (30d)" value={data.orderCount} />
      <KpiCard label="Revenue (30d)" value={`₹${data.totalRevenue.toFixed(2)}`} />
      <KpiCard label="Avg Order Value" value={`₹${data.averageOrderValue.toFixed(2)}`} />
    </div>
  );
}

function CustomersReport({ params }: { params: URLSearchParams }) {
  const { data, isLoading } = useAdminQuery(() => adminApi.getCustomersReport(params), [params.toString()]);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <div className="grid grid-cols-2 gap-4">
      <KpiCard label="New Customers (30d)" value={data.newCustomers} />
      <KpiCard label="Total Customers" value={data.totalCustomers} />
    </div>
  );
}

function OrdersReport({ params }: { params: URLSearchParams }) {
  const { data, isLoading } = useAdminQuery(() => adminApi.getOrdersReport(params), [params.toString()]);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Orders" value={data.orderCount} />
        <KpiCard label="Revenue" value={`₹${data.totalRevenue.toFixed(2)}`} />
        <KpiCard label="Avg Order Value" value={`₹${data.averageOrderValue.toFixed(2)}`} />
      </div>
      <div className="rounded-md bg-white p-4 shadow-rest">
        <h3 className="mb-3 font-semibold text-ink">Status Breakdown</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Object.entries(data.statusBreakdown).map(([status, count]) => (
            <div key={status} className="flex justify-between rounded border border-fog p-3">
              <span className="capitalize">{status.replaceAll("_", " ")}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsReport() {
  const { data, isLoading } = useAdminQuery(() => adminApi.getProductsReport(), []);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <ul className="flex flex-col divide-y divide-fog rounded-md bg-white shadow-rest">
      {data.lowestStock.map((v) => (
        <li key={v.id} className="flex justify-between p-4">
          <span>{v.name} ({v.sku})</span>
          <span className="font-semibold">{v.stockQuantity} units</span>
        </li>
      ))}
    </ul>
  );
}

function CouponsReport() {
  const { data, isLoading } = useAdminQuery(() => adminApi.getCouponsReport(), []);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <ul className="flex flex-col divide-y divide-fog rounded-md bg-white shadow-rest">
      {data.map((c) => (
        <li key={c.id} className="flex justify-between p-4">
          <span>{c.code}</span>
          <span>{c.timesRedeemed} redemptions</span>
        </li>
      ))}
    </ul>
  );
}

function ReportsContent() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    return p;
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="font-display text-[32px] font-semibold text-ink">Reports</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-stone">From<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="rounded border border-fog bg-white px-3 py-2 text-ink" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium text-stone">To<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="rounded border border-fog bg-white px-3 py-2 text-ink" /></label>
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded border border-fog px-3 py-2 text-sm font-semibold text-ink">Last 30 days</button>
        </div>
      </div>
      <Tabs
        items={[
          { id: "sales", label: "Sales Summary", content: <SalesReport params={params} /> },
          { id: "orders", label: "Orders", content: <OrdersReport params={params} /> },
          { id: "customers", label: "Customers", content: <CustomersReport params={params} /> },
          { id: "products", label: "Products (Low Stock)", content: <ProductsReport /> },
          { id: "coupons", label: "Coupons", content: <CouponsReport /> },
        ]}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><ReportsContent /></AdminShell>
    </RequireAdminAuth>
  );
}
