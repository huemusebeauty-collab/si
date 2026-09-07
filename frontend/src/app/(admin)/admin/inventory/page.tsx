"use client";

import { useMemo, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminInventoryItem } from "@/admin/lib/admin-api-client";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

function InventoryContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listInventory(), []);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((item) =>
      [item.sku, item.name, item.product.name, item.product.category].some((value) => value.toLowerCase().includes(q)),
    );
  }, [data, query]);

  async function saveStock(item: AdminInventoryItem) {
    try {
      await adminApi.setInventoryStock(item.id, quantity, item.version);
      setEditing(null);
      setToast(`${item.sku} stock updated.`);
      refetch();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update stock.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Inventory</h1>
        <p className="mt-1 text-sm text-muted">Manage SKU stock, low-stock items and availability from one place.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, SKU or category..."
          className="w-full max-w-md rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink"
        />
        <div className="text-sm text-muted">{rows.length} SKU{rows.length === 1 ? "" : "s"}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-line bg-surface">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">State</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading inventory...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No inventory records yet.</td></tr>
            ) : rows.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-4 py-4 font-semibold text-ink">{item.product.name}<div className="font-normal text-xs text-muted">{item.name}</div></td>
                <td className="px-4 py-4">{item.product.category}</td>
                <td className="px-4 py-4 font-mono text-xs">{item.sku}</td>
                <td className="px-4 py-4">
                  {editing === item.id ? (
                    <input
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                      className="w-24 rounded-md border border-line px-2 py-1"
                    />
                  ) : item.stockQuantity}
                </td>
                <td className="px-4 py-4"><Badge tone={item.stockState === "in-stock" ? "success" : item.stockState === "low-stock" ? "warning" : "information"}>{item.stockState}</Badge></td>
                <td className="px-4 py-4">
                  <RoleGate module="products" level="edit">
                    {editing === item.id ? (
                      <div className="flex gap-2"><Button variant="text" onClick={() => saveStock(item)}>Save</Button><Button variant="text" onClick={() => setEditing(null)}>Cancel</Button></div>
                    ) : (
                      <Button variant="text" onClick={() => { setEditing(item.id); setQuantity(item.stockQuantity); }}>Edit stock</Button>
                    )}
                  </RoleGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function InventoryPage() {
  return <RequireAdminAuth><AdminShell><InventoryContent /></AdminShell></RequireAdminAuth>;
}
