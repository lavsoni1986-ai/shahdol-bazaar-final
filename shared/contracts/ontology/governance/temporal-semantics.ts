export const TEMPORAL_SEMANTICS = {
  'time.open_now': 'time.open_now',
  'time.night': 'time.night',
  'time.late_night': 'time.late_night',
  'time.emergency': 'time.emergency',
  'time.morning': 'time.morning',
  'time.closed': 'time.closed',
  'time.unknown': 'time.unknown',

  // Night economy domain-specific semantics
  'food.night': 'food.night',
  'transport.night': 'transport.night',
  'emergency.24x7': 'emergency.24x7'
} as const;

export type TemporalSemanticKey = keyof typeof TEMPORAL_SEMANTICS;
