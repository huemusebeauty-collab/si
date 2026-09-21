"use client";
import { use, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminInvoice } from "@/admin/lib/admin-api-client";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { ErrorRecovery } from "@/components/patterns/ErrorRecovery";
import { Badge } from "@/components/basic/Badge";
import { Button } from "@/components/basic/Button";
import { Toast } from "@/components/composite/Toast";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"\x27]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\x27": "&#39;" }[character] ?? character));
}

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
  const [invoice, setInvoice] = useState<AdminInvoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { data: order, isLoading, error, refetch } = useAdminQuery(() => adminApi.getOrder(orderId), [orderId]);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;
  if (error || !order) return <ErrorRecovery body={error ?? "Order not found."} onRetry={refetch} />;

  const printInvoice = async () => {
    setPrinting(true);
    try {
      const issued = invoice?.invoiceNumber ? invoice : await adminApi.issueAdminInvoice(order.id);
      setInvoice(issued);
      const lines = Array.isArray(issued.lineItems)
        ? issued.lineItems.map((item, index) => {
            const row = item as Record<string, unknown>;
            const name = String(row.productName ?? row.name ?? `Item ${index + 1}`);
            const quantity = Number(row.quantity ?? 1);
            const unitPrice = String(row.unitPrice ?? "0.00");
            return `<tr><td>${escapeHtml(name)}</td><td style="text-align:center">${quantity}</td><td style="text-align:right">₹${escapeHtml(unitPrice)}</td></tr>`;
          }).join("")
        : "";
      const html = `<!doctype html><html><head><title>Invoice ${escapeHtml(issued.invoiceNumber ?? order.id)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#222}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}.total{margin-top:18px;text-align:right;font-size:18px;font-weight:700}@media print{button{display:none}}</style></head><body><h1>SILKU</h1><div>Tax Invoice</div><p>Invoice: <strong>${escapeHtml(issued.invoiceNumber ?? "")}</strong><br>Order: ${escapeHtml(order.id)}<br>Issued: ${escapeHtml(issued.issuedAt ? new Date(issued.issuedAt).toLocaleString() : "")}</p><table><thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead><tbody>${lines}</tbody></table><div class="total">Total: ₹${escapeHtml(issued.total)} ${escapeHtml(issued.currency)}</div><script>window.onload=()=>window.print()</script></body></html>`;
      const popup = window.open("", "silku-invoice-print", "width=900,height=700");
      if (!popup) throw new Error("Please allow pop-ups to print the invoice.");
      popup.document.open(); popup.document.write(html); popup.document.close();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to print invoice.");
    } finally { setPrinting(false); }
  };


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
      <div className="rounded-md bg-white p-6 shadow-rest">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink">Invoice Preview</h2>
            <p className="mt-1 text-sm text-muted">{invoice?.invoiceNumber ? `Issued invoice ${invoice.invoiceNumber}.` : "Preview only until an invoice is issued."}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setInvoiceLoading(true);
                  setInvoice(await adminApi.getAdminInvoice(order.id));
                } catch (error) {
                  setToast(error instanceof Error ? error.message : "Unable to load invoice preview.");
                } finally {
                  setInvoiceLoading(false);
                }
              }}
            >{invoiceLoading ? "Loading..." : "Load Invoice"}</Button>
            <RoleGate module="orders" level="edit">
              <Button
                variant="primary"
                disabled={invoiceLoading || Boolean(invoice?.invoiceNumber)}
                onClick={async () => {
                  try {
                    setInvoiceLoading(true);
                    setInvoice(await adminApi.issueAdminInvoice(order.id));
                    setToast("Invoice issued successfully.");
                  } catch (error) {
                    setToast(error instanceof Error ? error.message : "Unable to issue invoice.");
                  } finally {
                    setInvoiceLoading(false);
                  }
                }}
              >{invoice?.invoiceNumber ? "Invoice Issued" : "Issue Invoice"}</Button>
            </RoleGate>
          </div>
        </div>
        {invoice && (
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>₹{invoice.subtotal}</strong></div>
            <div className="flex justify-between"><span>Discount</span><strong>₹{invoice.discountAmount}</strong></div>
            <div className="flex justify-between"><span>Taxable</span><strong>₹{invoice.taxableAmount}</strong></div>
            <div className="flex justify-between"><span>GST</span><strong>₹{invoice.taxAmount}</strong></div>
            <div className="flex justify-between border-t border-line pt-2"><span>Total</span><strong>₹{invoice.total} {invoice.currency}</strong></div>
            <div className="text-xs text-muted">Layout: {invoice.layout.size} / {invoice.layout.format} · Generated {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : "Not issued"}</div>
          </div>
        )}
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
