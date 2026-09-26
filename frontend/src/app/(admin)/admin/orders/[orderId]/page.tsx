"use client";
import { use, useEffect, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi, type AdminInvoice, type AdminShipment } from "@/admin/lib/admin-api-client";
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
  const [pdfMode, setPdfMode] = useState(false);
  const [shipment, setShipment] = useState<AdminShipment | null>(null);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentUpdating, setShipmentUpdating] = useState(false);
  const { data: order, isLoading, error, refetch } = useAdminQuery(() => adminApi.getOrder(orderId), [orderId]);

  useEffect(() => {
    let active = true;
    if (!order) return () => { active = false; };
    setShipmentLoading(true);
    void adminApi.getOrderShipment(order.id)
      .then((next) => { if (active) setShipment(next); })
      .catch(() => { if (active) setShipment(null); })
      .finally(() => { if (active) setShipmentLoading(false); });
    return () => { active = false; };
  }, [order?.id]);

  if (isLoading) return <SkeletonLoader className="h-64 w-full" />;
  if (error || !order) return <ErrorRecovery body={error ?? "Order not found."} onRetry={refetch} />;

  const openInvoicePrint = async (mode: "print" | "pdf") => {
    setPrinting(true);
    setPdfMode(mode === "pdf");
    try {
      const issued = invoice?.invoiceNumber ? invoice : await adminApi.issueAdminInvoice(order.id);
      setInvoice(issued);

      const supplier: Record<string, unknown> = issued.supplier ?? {};
      const recipient: Record<string, unknown> = issued.recipient ?? {};
      const address: Record<string, unknown> = issued.shippingAddress ?? (recipient.deliveryAddress as Record<string, unknown> | undefined) ?? {};
      const get = (source: Record<string, unknown>, key: string) => source[key] == null ? "" : String(source[key]);
      const fullAddress = [
        get(address, "line1"),
        get(address, "line2"),
        [get(address, "city"), get(address, "region"), get(address, "postalCode")].filter(Boolean).join(", "),
        get(address, "country"),
      ].filter(Boolean).join("<br>");
      const lines = Array.isArray(issued.lineItems)
        ? issued.lineItems.map((item, index) => {
            const row = item as Record<string, unknown>;
            const name = String(row.productName ?? row.name ?? `Item ${index + 1}`);
            const quantity = Number(row.quantity ?? 1);
            const unitPrice = String(row.unitPrice ?? "0.00");
            const lineTotal = Number(row.taxableAmount ?? Number(unitPrice) * quantity);
            const tax = String(row.taxAmount ?? "0.00");
            return `<tr><td>${escapeHtml(name)}</td><td style="text-align:center">${quantity}</td><td style="text-align:right">₹${escapeHtml(unitPrice)}</td><td style="text-align:right">₹${lineTotal.toFixed(2)}</td><td style="text-align:right">₹${escapeHtml(tax)}</td></tr>`;
          }).join("")
        : "";

      const html = `<!doctype html><html><head><title>Silku Invoice ${escapeHtml(issued.invoiceNumber ?? order.id)}</title>
<style>
body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#222;font-size:13px}
.wrap{max-width:900px;margin:auto}.header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:16px}
h1{margin:0 0 4px;font-size:28px}.muted{color:#666}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:22px}
.box{border:1px solid #ddd;padding:14px;border-radius:6px}h2{font-size:14px;margin:0 0 8px}
table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}th{background:#f5f5f5}
.summary{margin:20px 0 0 auto;width:330px}.row{display:flex;justify-content:space-between;padding:5px 0}.grand{border-top:2px solid #222;margin-top:7px;padding-top:9px;font-size:17px;font-weight:700}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666}
@media print{body{padding:0}.no-print{display:none!important}.wrap{max-width:none}}
</style></head><body><div class="wrap">
<div class="header"><div><h1>SILKU</h1><div>Tax Invoice</div></div><div style="text-align:right"><strong>Invoice:</strong> ${escapeHtml(issued.invoiceNumber ?? "")}<br><strong>Order:</strong> ${escapeHtml(order.id)}<br><strong>Issued:</strong> ${escapeHtml(issued.issuedAt ? new Date(issued.issuedAt).toLocaleString() : "")}</div></div>
<div class="grid"><div class="box"><h2>Bill From</h2><strong>${escapeHtml(get(supplier, "legalEntityName"))}</strong><br>${escapeHtml(get(supplier, "address"))}<br>${escapeHtml(get(supplier, "state"))} ${escapeHtml(get(supplier, "stateCode"))}<br>${get(supplier, "gstin") ? `GSTIN: ${escapeHtml(get(supplier, "gstin"))}` : ""}</div>
<div class="box"><h2>Bill To / Delivery Address</h2><strong>${escapeHtml(get(recipient, "legalName") || get(address, "fullName"))}</strong><br>${fullAddress}<br>${get(address, "phone") ? `Phone: ${escapeHtml(get(address, "phone"))}<br>` : ""}${get(recipient, "gstin") ? `GSTIN: ${escapeHtml(get(recipient, "gstin"))}` : ""}</div></div>
<table><thead><tr><th>Product</th><th>Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Taxable</th><th style="text-align:right">GST</th></tr></thead><tbody>${lines}</tbody></table>
<div class="summary"><div class="row"><span>Subtotal</span><strong>₹${escapeHtml(issued.subtotal)}</strong></div><div class="row"><span>Discount</span><strong>- ₹${escapeHtml(issued.discountAmount)}</strong></div><div class="row"><span>Taxable Amount</span><strong>₹${escapeHtml(issued.taxableAmount)}</strong></div><div class="row"><span>GST</span><strong>₹${escapeHtml(issued.taxAmount)}</strong></div><div class="row"><span>Logistics / Shipping Fee</span><strong>₹${escapeHtml(issued.logisticsFee ?? "0.00")}</strong></div><div class="row"><span>Platform Fee</span><strong>₹${escapeHtml(issued.platformFee ?? "0.00")}</strong></div><div class="row grand"><span>Total Paid</span><strong>₹${escapeHtml(issued.total)} ${escapeHtml(issued.currency)}</strong></div></div>
<div class="footer">This invoice is generated from the recorded order and invoice snapshot. Invoice layout: ${escapeHtml(issued.layout.size)} / ${escapeHtml(issued.layout.format)}.</div>
</div><script>window.onload=()=>window.print()</script></body></html>`;
      const popup = window.open("", "silku-invoice-print", "width=1000,height=800");
      if (!popup) throw new Error("Please allow pop-ups to print or save the invoice as PDF.");
      popup.document.open(); popup.document.write(html); popup.document.close();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to open invoice.");
    } finally {
      setPrinting(false);
      setPdfMode(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Orders", href: "/admin/orders" }, { label: order.id.slice(0, 8) }]} />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-semibold text-ink">Order {order.id.slice(0, 8)}</h1>
        <Badge tone="information">{order.status}</Badge>
      </div>
      <div className="rounded-md bg-white p-6 shadow-rest">
        <h2 className="mb-3 font-semibold text-ink">Customer Details</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><strong>Name:</strong> {order.customer?.name || order.customerLegalName || "—"}</p>
          <p><strong>Customer ID:</strong> {order.customerId}</p>
          <p><strong>Email:</strong> {order.customer?.email || "—"}</p>
          <p><strong>Phone:</strong> {order.customer?.phone || (typeof order.shippingAddress?.phone === "string" ? order.shippingAddress.phone : "—")}</p>
          <p><strong>GSTIN:</strong> {order.customerGstin || "—"}</p>
          <p><strong>Total:</strong> ₹{order.total} {order.currency}</p>
          <p><strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        {order.shippingAddress && (
          <div className="mt-4 rounded border border-line p-3 text-sm">
            <strong>Delivery Address</strong>
            <div className="mt-1">
              {[
                order.shippingAddress.fullName,
                order.shippingAddress.line1,
                order.shippingAddress.line2,
                [order.shippingAddress.city, order.shippingAddress.region, order.shippingAddress.postalCode].filter(Boolean).join(", "),
                order.shippingAddress.country,
              ].filter(Boolean).map(String).join(" · ")}
            </div>
          </div>
        )}
        {order.customer?.addresses?.length ? (
          <div className="mt-4 rounded border border-line p-3 text-sm">
            <strong>Saved Customer Addresses</strong>
            <div className="mt-2 grid gap-2">
              {order.customer.addresses.map((address) => (
                <div key={String(address.id)} className="rounded bg-paper p-2">
                  {[
                    address.fullName,
                    address.line1,
                    address.line2,
                    [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
                    address.country,
                  ].filter(Boolean).map(String).join(" · ")}
                  {address.phone ? ` · ${String(address.phone)}` : ""}
                  {address.isDefault ? " · Default" : ""}
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
            >{invoiceLoading ? "Loading..." : "Load Bill"}</Button>
            <Button
              variant="outline"
              disabled={printing || !invoice?.invoiceNumber}
              onClick={() => void openInvoicePrint("pdf")}
            >{printing && pdfMode ? "Opening PDF..." : "Save PDF"}</Button>
            <Button
              variant="outline"
              disabled={printing || !invoice?.invoiceNumber}
              onClick={() => void openInvoicePrint("print")}
            >{printing && !pdfMode ? "Opening..." : "Print Bill"}</Button>
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
            <div className="flex justify-between"><span>Logistics / Shipping Fee</span><strong>₹{invoice.logisticsFee ?? "0.00"}</strong></div>
            <div className="flex justify-between"><span>Platform Fee</span><strong>₹{invoice.platformFee ?? "0.00"}</strong></div>
            <div className="flex justify-between border-t border-line pt-2"><span>Total Paid</span><strong>₹{invoice.total} {invoice.currency}</strong></div>
            <div className="text-xs text-muted">Layout: {invoice.layout.size} / {invoice.layout.format} · Generated {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : "Not issued"}</div>
          </div>
        )}
      </div>

      <RoleGate module="orders" level="edit">
        <div className="rounded-md bg-white p-6 shadow-rest">
          <h2 className="mb-3 font-semibold text-ink">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {(VALID_TRANSITIONS[order.status] ?? [])
              .filter((s) => !(
                (order.status === "processing" && s === "shipped") ||
                (order.status === "shipped" && s === "delivered") ||
                (order.status === "delivered" && s === "returned")
              ))
              .map((s) => (
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

            {order.status === "processing" && (
              <Button
                variant="primary"
                disabled={shipmentLoading || shipmentUpdating || !shipment || !["ready_to_ship", "pickup_scheduled"].includes(shipment.status)}
                onClick={async () => {
                  if (!shipment) return;
                  setShipmentUpdating(true);
                  try {
                    await adminApi.updateShipmentStatus(shipment.id, {
                      status: "picked_up",
                      description: "Order picked up for dispatch.",
                    });
                    setToast("Shipment marked picked up; order will move to shipped.");
                    setShipment(await adminApi.getOrderShipment(order.id));
                    await refetch();
                  } catch (error) {
                    setToast(error instanceof Error ? error.message : "Unable to update shipment.");
                  } finally {
                    setShipmentUpdating(false);
                  }
                }}
              >{shipmentUpdating ? "Updating..." : "Ship Order"}</Button>
            )}

            {(order.status === "processing" || order.status === "shipped" || order.status === "delivered") && (
              <div className="w-full text-sm text-muted">
                {shipmentLoading
                  ? "Loading fulfillment workflow..."
                  : shipment
                    ? `Fulfillment: ${shipment.status}. Shipment status must be advanced from Logistics.`
                    : "No shipment is linked to this order. Create/repair the shipment from Logistics before shipping."}
              </div>
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
