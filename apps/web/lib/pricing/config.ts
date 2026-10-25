/**
 * Pricing engine configuration.
 * Scope: Stub — M0. Populated with real rates in Milestone M2.
 *
 * All rates are defined here so they are configurable without touching
 * pricing formula code. See SPEC.md §7 and IMPLEMENTATION_PLAN.md §M2.
 *
 * OPEN QUESTIONS (to resolve before M2):
 * - Exact cost_per_gram for PLA and PETG (INR/gram).
 * - Exact machine_rate_per_hour (INR/hour).
 * - Setup fee per job (INR).
 * - Margin percentage.
 * - Minimum order price (INR paise).
 * - Print time estimation model (linear volume coefficient).
 */

export const PRICING_CONFIG = {
  // TODO(M2): Replace placeholder values with confirmed rates.
  materials: {
    PLA: {
      density_g_per_cm3: 1.24,
      cost_per_gram_paise: 0, // OPEN QUESTION: Confirm rate before M2.
    },
    PETG: {
      density_g_per_cm3: 1.27,
      cost_per_gram_paise: 0, // OPEN QUESTION: Confirm rate before M2.
    },
  },
  machine_rate_per_hour_paise: 0, // OPEN QUESTION: Confirm rate before M2.
  setup_fee_paise: 0,             // OPEN QUESTION: Confirm before M2.
  margin_pct: 0,                  // OPEN QUESTION: Confirm before M2.
  minimum_order_paise: 0,         // OPEN QUESTION: Confirm before M2.
  // Phase 1 linear print-time model: volume_cm3 * this_factor = print_hours
  print_time_hours_per_cm3: 0,    // OPEN QUESTION: Calibrate before M2.
} as const;

export type MaterialKey = keyof typeof PRICING_CONFIG.materials;
