"use client";
import { useState } from "react";
import Link from "next/link";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { DataTable, type Column } from "@/admin/components/DataTable";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminProduct } from "@/admin/lib/admin-api-client";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

function ProductsContent() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const { data, isLoading, refetch } = useAdminQuery(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    return adminApi.listProducts(params);
  }, [page]);

  async function handleActivate(id: string) { try { await adminApi.activateProduct(id); setToast("Product activated."); refetch(); } catch (e) { setToast(e instanceof Error ? e.message : "Unable to activate product."); } }
  async function handleDeactivate(id: string) { try { await adminApi.deactivateProduct(id); setToast("Product deactivated."); refetch(); } catch (e) { setToast(e instanceof Error ? e.message : "Unable to deactivate product."); } }

  const columns: Column<AdminProduct>[] = [
    { header: "Name", render: (p) => <span className="font-semibold text-ink">{p.name}</span> },
    { header: "Category", render: (p) => p.category?.name ?? "—" },
    { header: "Price", render: (p) => `$${p.price}` },
    { header: "Status", render: (p) => <Badge tone={p.status === "active" ? "success" : "information"}>{p.status}</Badge> },
    { header: "Visibility", render: (p) => p.visibility },
    { header: "Actions", render: (p) => <RoleGate module="products" level="edit"><div className="flex gap-2">{p.status !== "active" ? <Button variant="text" onClick={() => handleActivate(p.id)}>Activate</Button> : <Button variant="text" onClick={() => handleDeactivate(p.id)}>Deactivate</Button>}</div></RoleGate> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-[32px] font-semibold text-ink">Products</h1><p className="mt-1 text-sm text-muted">Build and publish the Silku catalogue.</p></div>
        <RoleGate module="products" level="edit"><Link href="/admin/products/new"><Button variant="primary">+ Add Product</Button></Link></RoleGate>
      </div>
      <RoleGate module="products" level="full"><div className="flex gap-2"><Button variant="outline" disabled={selected.size === 0} onClick={async () => { await adminApi.bulkActivateProducts(Array.from(selected)); setToast(`Activated ${selected.size} product(s).`); setSelected(new Set()); refetch(); }}>Bulk Activate ({selected.size})</Button><Button variant="outline" disabled={selected.size === 0} onClick={async () => { await adminApi.bulkDeactivateProducts(Array.from(selected)); setToast(`Deactivated ${selected.size} product(s).`); setSelected(new Set()); refetch(); }}>Bulk Deactivate</Button></div></RoleGate>
      <DataTable columns={columns} rows={data?.items ?? []} isLoading={isLoading} emptyMessage="No products yet — add your first catalogue product." page={page} totalPages={data?.meta.totalPages ?? 1} onPageChange={setPage} selectable selectedIds={selected} onToggleSelect={(id) => { const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); }} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function ProductsPage() { return <RequireAdminAuth><AdminShell><ProductsContent /></AdminShell></RequireAdminAuth>; }
