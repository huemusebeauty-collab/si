export interface TaxCalculation {
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
}

/**
 * Calculates GST without ever allowing the consumer payable amount to
 * exceed the variant MRP. For tax-inclusive MRP, GST is extracted using
 * amount * rate / (100 + rate). For tax-exclusive pricing, GST is added
 * only when the resulting payable remains within MRP.
 */
export function calculateGstWithinMrp(params: {
  amountAfterDiscount: number;
  mrp?: number | null;
  gstRate?: number | null;
  taxInclusiveMrp: boolean;
}): TaxCalculation {
  const grossAmount = Math.max(0, roundMoney(params.amountAfterDiscount));
  const rate = params.gstRate == null ? 0 : Number(params.gstRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error("GST rate must be between 0 and 100 percent.");
  }

  const mrp = params.mrp == null ? null : roundMoney(params.mrp);
  if (mrp != null && mrp < 0) throw new Error("MRP cannot be negative.");
  if (mrp != null && grossAmount > mrp + 0.005) {
    throw new Error("Discounted selling amount cannot exceed MRP.");
  }

  if (rate === 0) {
    if (mrp != null && grossAmount > mrp + 0.005) throw new Error("Final payable cannot exceed MRP.");
    return { grossAmount, taxableAmount: grossAmount, taxAmount: 0 };
  }

  if (params.taxInclusiveMrp) {
    const taxAmount = roundMoney(grossAmount * rate / (100 + rate));
    const taxableAmount = roundMoney(grossAmount - taxAmount);
    return { grossAmount, taxableAmount, taxAmount };
  }

  const taxAmount = roundMoney(grossAmount * rate / 100);
  const payable = roundMoney(grossAmount + taxAmount);
  if (mrp != null && payable > mrp + 0.005) {
    throw new Error("GST-inclusive final payable cannot exceed MRP.");
  }
  return { grossAmount: payable, taxableAmount: grossAmount, taxAmount };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
