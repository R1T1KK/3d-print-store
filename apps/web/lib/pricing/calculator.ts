/**
 * Deterministic server-side pricing calculator.
 * Source of Truth: SPEC.md §7
 * Never trust client prices: always compute on server from stored geometry metrics.
 */

import { PRICING_CONFIG, MaterialKey } from "./config";

export interface QuoteCalculationInput {
  volumeMm3: number;
  material: string;
  infillPct: number;      // 15 - 100
  layerHeight: number;    // e.g. 0.12, 0.20, 0.28
  quantity: number;       // >= 1
}

export interface QuotePricingBreakdown {
  volumeCm3: number;
  effectiveInfillPct: number;
  estimatedWeightGrams: number;
  materialCostPaise: number;
  estimatedPrintHours: number;
  machineCostPaise: number;
  setupFeePaise: number;
  subtotalPaise: number;
  marginPaise: number;
  unitPricePaise: number;
  totalPricePaise: number;
  // User-facing INR equivalents (paise / 100)
  unitPriceInr: number;
  totalPriceInr: number;
}

export function calculateDeterministicQuote(input: QuoteCalculationInput): QuotePricingBreakdown {
  const { volumeMm3, infillPct, layerHeight, quantity } = input;
  const clampedQty = Math.max(1, Math.floor(quantity || 1));
  const clampedInfill = Math.min(100, Math.max(15, infillPct || 20));

  // 1. Material lookup (default to PLA if unrecognized)
  const normMaterial = (input.material?.toUpperCase() || "PLA") as MaterialKey;
  const matConfig = PRICING_CONFIG.materials[normMaterial] || PRICING_CONFIG.materials.PLA;

  // 2. Volume conversion: mm³ -> cm³
  const volumeCm3 = Math.max(0.1, Number((volumeMm3 / 1000).toFixed(2)));

  // 3. Effective density factoring shell perimeters + sparse infill
  const infillFraction = clampedInfill / 100;
  const effectiveInfill = 0.25 + infillFraction * 0.75;
  const estimatedWeightGrams = Number((volumeCm3 * effectiveInfill * matConfig.density_g_per_cm3).toFixed(2));

  // 4. Material cost in paise
  const materialCostPaise = Math.round(estimatedWeightGrams * matConfig.cost_per_gram_paise);

  // 5. Machine time estimation
  const layerMultiplier = PRICING_CONFIG.layer_height_multipliers[layerHeight] || 1.0;
  const estimatedPrintHours = Number(Math.max(0.8, (volumeCm3 * 0.08 + 0.5) * layerMultiplier).toFixed(2));
  const machineCostPaise = Math.round(estimatedPrintHours * PRICING_CONFIG.machine_rate_per_hour_paise);

  // 6. Subtotal
  const setupFeePaise = PRICING_CONFIG.setup_fee_paise;
  const subtotalPaise = materialCostPaise + machineCostPaise + setupFeePaise;

  // 7. Margin & minimum price floor
  const marginPaise = Math.round(subtotalPaise * PRICING_CONFIG.margin_pct);
  const calculatedUnit = subtotalPaise + marginPaise;
  const unitPricePaise = Math.max(PRICING_CONFIG.minimum_order_paise, calculatedUnit);
  const totalPricePaise = unitPricePaise * clampedQty;

  return {
    volumeCm3,
    effectiveInfillPct: clampedInfill,
    estimatedWeightGrams,
    materialCostPaise,
    estimatedPrintHours,
    machineCostPaise,
    setupFeePaise,
    subtotalPaise,
    marginPaise,
    unitPricePaise,
    totalPricePaise,
    unitPriceInr: Math.round(unitPricePaise / 100),
    totalPriceInr: Math.round(totalPricePaise / 100),
  };
}
