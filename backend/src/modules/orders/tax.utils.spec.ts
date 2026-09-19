import { calculateGstWithinMrp } from "./tax.utils";

describe("calculateGstWithinMrp", () => {
  it("splits intra-state GST into equal CGST and SGST rates", () => {
    const result = calculateGstWithinMrp({
      amountAfterDiscount: 118,
      gstRate: 18,
      taxInclusiveMrp: true,
      supplierStateCode: "08",
      placeOfSupplyStateCode: "08",
      gstRegistered: true,
    });

    expect(result).toEqual({
      grossAmount: 118,
      taxableAmount: 100,
      taxAmount: 18,
      taxType: "cgst_sgst",
      cgstRate: 9,
      cgstAmount: 9,
      sgstRate: 9,
      sgstAmount: 9,
      igstRate: 0,
      igstAmount: 0,
    });
  });

  it("uses IGST for inter-state supply", () => {
    const result = calculateGstWithinMrp({
      amountAfterDiscount: 118,
      gstRate: 18,
      taxInclusiveMrp: true,
      supplierStateCode: "08",
      placeOfSupplyStateCode: "27",
      gstRegistered: true,
    });

    expect(result.taxType).toBe("igst");
    expect(result.igstRate).toBe(18);
    expect(result.igstAmount).toBe(18);
    expect(result.cgstAmount + result.sgstAmount).toBe(0);
  });

  it("does not require GST jurisdiction when the product rate is zero", () => {
    const result = calculateGstWithinMrp({
      amountAfterDiscount: 100,
      gstRate: 0,
      taxInclusiveMrp: true,
      gstRegistered: false,
    });

    expect(result.taxType).toBe("none");
    expect(result.taxAmount).toBe(0);
  });

  it("rejects taxable GST when supplier is not GST registered", () => {
    expect(() => calculateGstWithinMrp({
      amountAfterDiscount: 118,
      gstRate: 18,
      taxInclusiveMrp: true,
      supplierStateCode: "08",
      placeOfSupplyStateCode: "08",
      gstRegistered: false,
    })).toThrow("GST calculation requires a GST-registered supplier.");
  });

  it("rejects taxable GST when state codes are missing", () => {
    expect(() => calculateGstWithinMrp({
      amountAfterDiscount: 118,
      gstRate: 18,
      taxInclusiveMrp: true,
      gstRegistered: true,
    })).toThrow("Supplier and place-of-supply state codes are required");
  });
});
