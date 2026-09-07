export const INVOICE_SIZES = ["A4", "A5", "THERMAL_80MM", "THERMAL_58MM"] as const;
export type InvoiceSize = (typeof INVOICE_SIZES)[number];

export const INVOICE_FORMATS = ["STANDARD", "COMPACT", "THERMAL"] as const;
export type InvoiceFormat = (typeof INVOICE_FORMATS)[number];

export const DEFAULT_INVOICE_SIZE: InvoiceSize = "A4";
export const DEFAULT_INVOICE_FORMAT: InvoiceFormat = "STANDARD";

export interface InvoiceLayout {
  size: InvoiceSize;
  format: InvoiceFormat;
  width: "full" | "compact" | "80mm" | "58mm";
}

export function resolveInvoiceLayout(size?: string, format?: string): InvoiceLayout {
  const normalizedSize = size?.trim().toUpperCase() as InvoiceSize | undefined;
  const normalizedFormat = format?.trim().toUpperCase() as InvoiceFormat | undefined;
  const resolvedSize = INVOICE_SIZES.includes(normalizedSize as InvoiceSize)
    ? (normalizedSize as InvoiceSize)
    : DEFAULT_INVOICE_SIZE;
  const resolvedFormat = INVOICE_FORMATS.includes(normalizedFormat as InvoiceFormat)
    ? (normalizedFormat as InvoiceFormat)
    : DEFAULT_INVOICE_FORMAT;

  const width = resolvedSize === "THERMAL_80MM"
    ? "80mm"
    : resolvedSize === "THERMAL_58MM"
      ? "58mm"
      : resolvedSize === "A5"
        ? "compact"
        : "full";

  return { size: resolvedSize, format: resolvedFormat, width };
}
