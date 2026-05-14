export const FALLBACK_HIERARCHY = [
  'EXACT_DOMAIN',        // e.g. FOOD → FOOD vendors
  'SEMANTIC_DOMAIN',     // e.g. FOOD.night → verified night vendors
  'SAFE_AMBIGUOUS',      // e.g. nearby related commerce like GROCERY for food supplies
  'SUPPLY_GAP'           // constitutional unmet-demand response
] as const;

export type FallbackLevel = typeof FALLBACK_HIERARCHY[number];
