import { describe, it, expect } from "vitest";
import { calculateDeterministicQuote } from "@/lib/pricing/calculator";
import { PRICING_CONFIG } from "@/lib/pricing/config";

describe("Pricing Engine Unit Tests (SPEC.md §7)", () => {
  describe("Minimum Order Price Floor Clamp", () => {
    it("should clamp tiny models (1,000 mm³ / 1 cm³) to the minimum order floor (₹199 / 19,900 paise)", () => {
      const result = calculateDeterministicQuote({
        volumeMm3: 1000,
        material: "PLA",
        infillPct: 20,
        layerHeight: 0.2,
        quantity: 1,
      });

      expect(result.unitPricePaise).toBe(PRICING_CONFIG.minimum_order_paise);
      expect(result.unitPriceInr).toBe(199);
      expect(result.totalPricePaise).toBe(19900);
      expect(result.totalPriceInr).toBe(199);
    });

    it("should clamp near-zero volume (10 mm³) to the minimum order floor without crashing", () => {
      const result = calculateDeterministicQuote({
        volumeMm3: 10,
        material: "PLA",
        infillPct: 15,
        layerHeight: 0.2,
        quantity: 1,
      });

      expect(result.unitPricePaise).toBe(19900);
      expect(result.totalPricePaise).toBe(19900);
      expect(result.volumeCm3).toBeGreaterThan(0);
    });

    it("should exceed the minimum order floor for industrial/large models", () => {
      // 150 cm³ PETG model
      const result = calculateDeterministicQuote({
        volumeMm3: 150000,
        material: "PETG",
        infillPct: 40,
        layerHeight: 0.2,
        quantity: 1,
      });

      expect(result.unitPricePaise).toBeGreaterThan(19900);
      expect(result.unitPriceInr).toBeGreaterThan(199);
    });
  });

  describe("Integer Paise Precision & Rounding", () => {
    it("should produce strictly integer paise values for all breakdown components", () => {
      const result = calculateDeterministicQuote({
        volumeMm3: 37492,
        material: "PLA",
        infillPct: 33,
        layerHeight: 0.12,
        quantity: 1,
      });

      expect(Number.isInteger(result.materialCostPaise)).toBe(true);
      expect(Number.isInteger(result.machineCostPaise)).toBe(true);
      expect(Number.isInteger(result.setupFeePaise)).toBe(true);
      expect(Number.isInteger(result.subtotalPaise)).toBe(true);
      expect(Number.isInteger(result.marginPaise)).toBe(true);
      expect(Number.isInteger(result.unitPricePaise)).toBe(true);
      expect(Number.isInteger(result.totalPricePaise)).toBe(true);
      expect(Number.isInteger(result.unitPriceInr)).toBe(true);
      expect(Number.isInteger(result.totalPriceInr)).toBe(true);
    });

    it("should accurately reflect INR values as Math.round(paise / 100)", () => {
      const result = calculateDeterministicQuote({
        volumeMm3: 54321,
        material: "PETG",
        infillPct: 45,
        layerHeight: 0.2,
        quantity: 2,
      });

      expect(result.unitPriceInr).toBe(Math.round(result.unitPricePaise / 100));
      expect(result.totalPriceInr).toBe(Math.round(result.totalPricePaise / 100));
    });
  });

  describe("Quantity Scaling & Validation", () => {
    it("should strictly scale totalPricePaise linearly with quantity", () => {
      const single = calculateDeterministicQuote({
        volumeMm3: 80000,
        material: "PLA",
        infillPct: 25,
        layerHeight: 0.2,
        quantity: 1,
      });

      const triple = calculateDeterministicQuote({
        volumeMm3: 80000,
        material: "PLA",
        infillPct: 25,
        layerHeight: 0.2,
        quantity: 3,
      });

      expect(triple.unitPricePaise).toBe(single.unitPricePaise);
      expect(triple.totalPricePaise).toBe(single.unitPricePaise * 3);
      expect(triple.totalPriceInr).toBe(Math.round((single.unitPricePaise * 3) / 100));
    });

    it("should clamp zero, negative, or fractional quantities to at least 1", () => {
      const zeroQty = calculateDeterministicQuote({
        volumeMm3: 50000,
        material: "PLA",
        infillPct: 20,
        layerHeight: 0.2,
        quantity: 0,
      });
      expect(zeroQty.totalPricePaise).toBe(zeroQty.unitPricePaise * 1);

      const negativeQty = calculateDeterministicQuote({
        volumeMm3: 50000,
        material: "PLA",
        infillPct: 20,
        layerHeight: 0.2,
        quantity: -5,
      });
      expect(negativeQty.totalPricePaise).toBe(negativeQty.unitPricePaise * 1);

      const floatQty = calculateDeterministicQuote({
        volumeMm3: 50000,
        material: "PLA",
        infillPct: 20,
        layerHeight: 0.2,
        quantity: 3.7,
      });
      expect(floatQty.totalPricePaise).toBe(floatQty.unitPricePaise * 3);
    });
  });

  describe("Material Rates & Density Calibration", () => {
    it("should calculate material costs reflecting density and cost-per-gram hierarchies (RESIN > PETG > PLA)", () => {
      const vol = 60000; // 60 cm³

      const pla = calculateDeterministicQuote({ volumeMm3: vol, material: "PLA", infillPct: 30, layerHeight: 0.2, quantity: 1 });
      const petg = calculateDeterministicQuote({ volumeMm3: vol, material: "PETG", infillPct: 30, layerHeight: 0.2, quantity: 1 });
      const resin = calculateDeterministicQuote({ volumeMm3: vol, material: "RESIN", infillPct: 30, layerHeight: 0.2, quantity: 1 });

      expect(pla.materialCostPaise).toBeLessThan(petg.materialCostPaise);
      expect(petg.materialCostPaise).toBeLessThan(resin.materialCostPaise);
      expect(pla.estimatedWeightGrams).toBeLessThanOrEqual(petg.estimatedWeightGrams);
    });

    it("should gracefully default unrecognized or lowercase material strings to PLA", () => {
      const defaultPla = calculateDeterministicQuote({ volumeMm3: 40000, material: "PLA", infillPct: 20, layerHeight: 0.2, quantity: 1 });
      const lowercasePla = calculateDeterministicQuote({ volumeMm3: 40000, material: "pla", infillPct: 20, layerHeight: 0.2, quantity: 1 });
      const unknownMat = calculateDeterministicQuote({ volumeMm3: 40000, material: "UNKNOWN_PLASTIC", infillPct: 20, layerHeight: 0.2, quantity: 1 });

      expect(lowercasePla.unitPricePaise).toBe(defaultPla.unitPricePaise);
      expect(unknownMat.unitPricePaise).toBe(defaultPla.unitPricePaise);
    });
  });

  describe("Infill Percentage & Layer Height Multipliers", () => {
    it("should clamp infill percentages to valid engineering bounds [15, 100]", () => {
      const lowInfill = calculateDeterministicQuote({ volumeMm3: 50000, material: "PLA", infillPct: 5, layerHeight: 0.2, quantity: 1 });
      expect(lowInfill.effectiveInfillPct).toBe(15);

      const highInfill = calculateDeterministicQuote({ volumeMm3: 50000, material: "PLA", infillPct: 150, layerHeight: 0.2, quantity: 1 });
      expect(highInfill.effectiveInfillPct).toBe(100);
    });

    it("should scale print hours and machine costs inversely with layer height (0.12mm > 0.20mm > 0.28mm)", () => {
      const vol = 75000;
      const fine = calculateDeterministicQuote({ volumeMm3: vol, material: "PLA", infillPct: 20, layerHeight: 0.12, quantity: 1 });
      const standard = calculateDeterministicQuote({ volumeMm3: vol, material: "PLA", infillPct: 20, layerHeight: 0.20, quantity: 1 });
      const draft = calculateDeterministicQuote({ volumeMm3: vol, material: "PLA", infillPct: 20, layerHeight: 0.28, quantity: 1 });

      expect(fine.estimatedPrintHours).toBeGreaterThan(standard.estimatedPrintHours);
      expect(standard.estimatedPrintHours).toBeGreaterThan(draft.estimatedPrintHours);
      expect(fine.machineCostPaise).toBeGreaterThan(standard.machineCostPaise);
      expect(standard.machineCostPaise).toBeGreaterThan(draft.machineCostPaise);
    });
  });

  describe("Zero, Negative and Invalid Values Handling", () => {
    it("should handle zero and negative volume values without NaN or exceptions", () => {
      const zeroVol = calculateDeterministicQuote({ volumeMm3: 0, material: "PLA", infillPct: 20, layerHeight: 0.2, quantity: 1 });
      expect(Number.isNaN(zeroVol.unitPricePaise)).toBe(false);
      expect(zeroVol.unitPricePaise).toBe(19900);

      const negVol = calculateDeterministicQuote({ volumeMm3: -500, material: "PLA", infillPct: 20, layerHeight: 0.2, quantity: 1 });
      expect(Number.isNaN(negVol.unitPricePaise)).toBe(false);
      expect(negVol.unitPricePaise).toBe(19900);
    });
  });
});
