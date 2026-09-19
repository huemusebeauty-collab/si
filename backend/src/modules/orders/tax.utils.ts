export type GstTaxType = "none" | "cgst_sgst" | "igst";

export interface GstTaxCalculation {
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxType: GstTaxType;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
}

export function calculateGstWithinMrp(params: {
  amountAfterDiscount: number;
  mrp?: number | null;
  gstRate?: number | null;
  taxInclusiveMrp: boolean;
  supplierStateCode?: string | null;
  placeOfSupplyStateCode?: string | null;
  gstRegistered?: boolean;
}): GstTaxCalculation {
  const grossAmount = Math.max(0, roundMoney(params.amountAfterDiscount));
  const rate = params.gstRate == null ? 0 : Number(params.gstRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("GST rate must be between 0 and 100 percent.");

  const mrp = params.mrp == null ? null : roundMoney(params.mrp);
  if (mrp != null && mrp < 0) throw new Error("MRP cannot be negative.");
  if (mrp != null && grossAmount > mrp + 0.005) throw new Error("Discounted selling amount cannot exceed MRP.");

  const base = params.taxInclusiveMrp
    ? (() => {
        const taxAmount = roundMoney(grossAmount * rate / (100 + rate));
        return { grossAmount, taxableAmount: roundMoney(grossAmount - taxAmount), taxAmount };
      })()
    : (() => {
        const taxAmount = roundMoney(grossAmount * rate / 100);
        const payable = roundMoney(grossAmount + taxAmount);
        if (mrp != null && payable > mrp + 0.005) throw new Error("GST-inclusive final payable cannot exceed MRP.");
        return { grossAmount: payable, taxableAmount: grossAmount, taxAmount };
      })();

  if (rate === 0) {
    return { ...base, taxType: "none", cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0 };
  }
  if (params.gstRegistered !== true) {
    return { grossAmount, taxableAmount: grossAmount, taxAmount: 0, taxType: "none", cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0 };
  }
  const supplier = params.supplierStateCode?.trim();
  const place = params.placeOfSupplyStateCode?.trim();
  if (!supplier || !place) throw new Error("Supplier and place-of-supply state codes are required for GST calculation.");
  if (!/^\d{2}$/.test(supplier) || !/^\d{2}$/.test(place)) throw new Error("GST state codes must be two digits.");

  if (supplier === place) {
    const halfRate = roundMoney(rate / 2);
    const cgstAmount = roundMoney(base.taxAmount / 2);
    const sgstAmount = roundMoney(base.taxAmount - cgstAmount);
    return { ...base, taxType: "cgst_sgst", cgstRate: halfRate, cgstAmount, sgstRate: halfRate, sgstAmount, igstRate: 0, igstAmount: 0 };
  }

  return { ...base, taxType: "igst", cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: rate, igstAmount: base.taxAmount };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
