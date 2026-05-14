import { TEMPORAL_SEMANTICS } from './temporal-semantics';
import { TRUST_SIGNALS } from './trust-signals';

// Machine-readable semantic rules - additive and non-destructive
export const ONTOLOGY_RULES = [
  {
    id: 'R1',
    description: 'electronics.repair belongs to SERVICES, electronics.store belongs to COMMERCE. Legacy "electronics" must not map to GROCERY.',
    match: { category: ['electronics.repair'] },
    action: { enforceDomain: 'SERVICES' }
  },
  {
    id: 'R2',
    description: 'food.* cannot fallback into healthcare (hospital/pharmacy) unless intent EMERGENCY is present.',
    match: { domain: ['FOOD'] },
    forbiddenFallbacks: ['HEALTHCARE'],
    exceptionIfIntent: ['EMERGENCY']
  },
  {
    id: 'R3',
    description: 'Temporal semantics (time.open_now, time.night) should not override domain isolation.',
    match: { temporal: Object.keys(TEMPORAL_SEMANTICS) },
    action: { preserveDomain: true }
  },
  {
    id: 'R4',
    description: 'If time-aware request and no verified temporal-capable entities, prefer SUPPLY_GAP over cross-domain fallback.',
    match: { temporal: ['time.open_now','time.night','time.late_night'] },
    action: { fallbackPreference: TRUST_SIGNALS.SUPPLY_GAP }
  }
];
