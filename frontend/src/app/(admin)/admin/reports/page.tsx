"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { Tabs } from "@/components/composite/Tabs";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { KpiCard } from "@/admin/components/KpiCard";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";

function SalesReport() {
  const { data, isLoading } = useAdminQuery(() => adminApi.getSalesSummary(new URLSearchParams()), []);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard label="Orders (30d)" value={data.orderCount} />
      <KpiCard label="Revenue (30d)" value={`$${data.totalRevenue.toFixed(2)}`} />
      <KpiCard label="Avg Order Value" value={`$${data.averageOrderValue.toFixed(2)}`} />
    </div>
  );
}

function CustomersReport() {
  const { data, isLoading } = useAdminQuery(() => adminApi.getCustomersReport(new URLSearchParams()), []);
  if (isLoading || !data) return <SkeletonLoader className="h-32 w-full" />;
  return (
    <div className="grid grid-cols-2 gap-4">
      <KpiCard label="New Customers (30d)" value={data.newCustomers} />
      <KpiCard label="Total Customers" value={data.totalCustomers} />
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
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Reports</h1>
      <Tabs
        items={[
          { id: "sales", label: "Sales Summary", content: <SalesReport /> },
          { id: "customers", label: "Customers", content: <CustomersReport /> },
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
