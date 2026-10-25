/**
 * Pricing engine configuration.
 * Source of Truth: SPEC.md §7 & ARCHITECTURE.md §2
 * All currency values are strictly stored in integer paise (1 INR = 100 paise).
 */

export const PRICING_CONFIG = {
  materials: {
    PLA: {
      label: "Tough PLA",
      density_g_per_cm3: 1.24,
      cost_per_gram_paise: 220, // ₹2.20 / g
    },
    PETG: {
      label: "PETG High Strength",
      density_g_per_cm3: 1.27,
      cost_per_gram_paise: 280, // ₹2.80 / g
    },
    RESIN: {
      label: "High-Detail UV Resin",
      density_g_per_cm3: 1.15,
      cost_per_gram_paise: 450, // ₹4.50 / g
    },
  },
  machine_rate_per_hour_paise: 4500, // ₹45.00 / hr
  setup_fee_paise: 5000,             // ₹50.00 setup fee
  margin_pct: 0.15,                  // 15% margin
  minimum_order_paise: 19900,        // ₹199.00 minimum floor
  // Layer height print time multipliers
  layer_height_multipliers: {
    0.12: 1.6,
    0.20: 1.0,
    0.28: 0.75,
  } as Record<number, number>,
} as const;

export type MaterialKey = keyof typeof PRICING_CONFIG.materials;
