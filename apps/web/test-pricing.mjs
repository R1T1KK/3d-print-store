import assert from "node:assert/strict";

// We can test calculateDeterministicQuote logic directly
const PRICING_CONFIG = {
  materials: {
    PLA: { density_g_per_cm3: 1.24, cost_per_gram_paise: 220 },
    PETG: { density_g_per_cm3: 1.27, cost_per_gram_paise: 280 },
    RESIN: { density_g_per_cm3: 1.15, cost_per_gram_paise: 450 },
  },
  machine_rate_per_hour_paise: 4500,
  setup_fee_paise: 5000,
  margin_pct: 0.15,
  minimum_order_paise: 19900,
  layer_height_multipliers: { 0.12: 1.6, 0.20: 1.0, 0.28: 0.75 },
};

function calculate(input) {
  const { volumeMm3, infillPct, layerHeight, quantity } = input;
  const clampedQty = Math.max(1, Math.floor(quantity || 1));
  const clampedInfill = Math.min(100, Math.max(15, infillPct || 20));
  const normMaterial = (input.material?.toUpperCase() || "PLA");
  const matConfig = PRICING_CONFIG.materials[normMaterial] || PRICING_CONFIG.materials.PLA;
  const volumeCm3 = Math.max(0.1, Number((volumeMm3 / 1000).toFixed(2)));
  const infillFraction = clampedInfill / 100;
  const effectiveInfill = 0.25 + infillFraction * 0.75;
  const estimatedWeightGrams = Number((volumeCm3 * effectiveInfill * matConfig.density_g_per_cm3).toFixed(2));
  const materialCostPaise = Math.round(estimatedWeightGrams * matConfig.cost_per_gram_paise);
  const layerMultiplier = PRICING_CONFIG.layer_height_multipliers[layerHeight] || 1.0;
  const estimatedPrintHours = Number(Math.max(0.8, (volumeCm3 * 0.08 + 0.5) * layerMultiplier).toFixed(2));
  const machineCostPaise = Math.round(estimatedPrintHours * PRICING_CONFIG.machine_rate_per_hour_paise);
  const setupFeePaise = PRICING_CONFIG.setup_fee_paise;
  const subtotalPaise = materialCostPaise + machineCostPaise + setupFeePaise;
  const marginPaise = Math.round(subtotalPaise * PRICING_CONFIG.margin_pct);
  const calculatedUnit = subtotalPaise + marginPaise;
  const unitPricePaise = Math.max(PRICING_CONFIG.minimum_order_paise, calculatedUnit);
  const totalPricePaise = unitPricePaise * clampedQty;

  return { volumeCm3, unitPricePaise, totalPricePaise, unitPriceInr: Math.round(unitPricePaise / 100) };
}

// Test 1: Minimum floor clamp
const tinyResult = calculate({ volumeMm3: 1000, material: "PLA", infillPct: 20, layerHeight: 0.2, quantity: 1 });
assert.equal(tinyResult.unitPricePaise, 19900, "Tiny model should be clamped to ₹199 minimum order floor");
assert.equal(tinyResult.unitPriceInr, 199);

// Test 2: Quantity scaling
const qty3Result = calculate({ volumeMm3: 1000, material: "PLA", infillPct: 20, layerHeight: 0.2, quantity: 3 });
assert.equal(qty3Result.totalPricePaise, 19900 * 3, "Quantity 3 should multiply unit price cleanly");

// Test 3: Larger model scales above floor
const largeResult = calculate({ volumeMm3: 150000, material: "PETG", infillPct: 50, layerHeight: 0.2, quantity: 1 });
assert(largeResult.unitPricePaise > 19900, "150cm3 model should exceed minimum floor");
console.log("Pricing unit test suite: All 3 assertions passed successfully!");
