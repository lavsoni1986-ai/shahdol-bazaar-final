// shared/contracts/ontology/signals.ts
// Signal Sovereignty Layer - Canonical Signals with Provenance

export enum CanonicalSignal {
  // Entity Operational Signals (objective truth about entity capabilities)
  OPEN_NOW = "OPEN_NOW",
  AVAILABLE = "AVAILABLE",
  EMERGENCY_SUPPORT = "EMERGENCY_SUPPORT",
  DELIVERY_ACTIVE = "DELIVERY_ACTIVE"
}

export enum OperationalSignalType {
  // Verified Operational Truth (observed/confirmed entity capabilities)
  VERIFIED_OPEN_HOURS = "VERIFIED_OPEN_HOURS",
  CONFIRMED_AVAILABILITY = "CONFIRMED_AVAILABILITY",
  CERTIFIED_EMERGENCY_SUPPORT = "CERTIFIED_EMERGENCY_SUPPORT",
  ACTIVE_DELIVERY_SERVICE = "ACTIVE_DELIVERY_SERVICE",

  // Inferred Operational Expectation (query-derived expectations)
  EXPECTED_OPEN_NOW = "EXPECTED_OPEN_NOW",
  EXPECTED_AVAILABLE = "EXPECTED_AVAILABLE",
  EXPECTED_EMERGENCY_SUPPORT = "EXPECTED_EMERGENCY_SUPPORT",
  EXPECTED_DELIVERY_ACTIVE = "EXPECTED_DELIVERY_ACTIVE"
}

export enum UserIntentSignal {
  // User Intent Signals (subjective user needs/context)
  URGENT_NEED = "URGENT_NEED",
  IMMEDIATE_REQUIREMENT = "IMMEDIATE_REQUIREMENT",
  TIME_SENSITIVE = "TIME_SENSITIVE"
}

export enum CanonicalSignalState {
  TRUE = "TRUE",
  FALSE = "FALSE",
  UNKNOWN = "UNKNOWN",
  STALE = "STALE",
  UNVERIFIED = "UNVERIFIED"
}

export const CANONICAL_SIGNALS = Object.values(CanonicalSignal);

// Signal Provenance Rules - Authority for signal verification
export enum SignalProvenance {
  VERIFIED_SCHEDULE = "verified_schedule", // Official business hours
  HUMAN_VERIFIED = "human_verified",     // Manual verification by operators
  VENDOR_CLAIM = "vendor_claim",         // Vendor self-reported
  ML_INFERENCE = "ml_inference",         // AI/ML predicted
  HISTORICAL_PATTERN = "historical_pattern" // Based on past behavior
}

// Signal Constitution - Sovereign signals with epistemic separation
export interface OperationalSignal {
  type: CanonicalSignal | OperationalSignalType;     // Entity capability signals
  state: CanonicalSignalState;

  // Epistemic timestamps (constitutional semantics)
  createdAt: number;         // When this signal was first constituted
  observedAt: number;        // When the underlying fact was observed
  refreshedAt: number;       // When this signal was last refreshed/updated
  evaluatedAt: number;       // When confidence was last evaluated (ephemeral)

  // Confidence Engine
  confidence: number;        // 0-1, how confident we are in this signal
  source: string;           // Provenance source
  provenance: SignalProvenance;
  verification: 'verified' | 'unverified' | 'inferred';

  // Decay tracking (provenance-aware)
  decayRate: number;        // How fast this signal loses confidence over time
  ttl: number;             // Time-to-live in seconds

  // Versioning & lineage
  signalVersion: number;    // Immutable version number
  parentSignalId?: string;  // For signal evolution chain
  lineage: string[];        // Chain of transformations
}

export interface UserContextSignal {
  type: UserIntentSignal;   // User context/urgency signals
  state: CanonicalSignalState;

  // Epistemic timestamps
  createdAt: number;        // When this intent was detected
  observedAt: number;       // When user expressed this intent
  refreshedAt: number;      // When context was re-evaluated
  evaluatedAt: number;      // When confidence was last evaluated

  // Confidence Engine (different semantics for user context)
  confidence: number;       // 0-1, how confident we are in user intent
  source: string;          // Detection source (e.g., 'query_analysis')
  provenance: SignalProvenance;
  verification: 'verified' | 'unverified' | 'inferred';

  // Context-specific decay (user intent persists differently)
  decayRate: number;       // Context relevance decay
  ttl: number;            // Context validity time

  // Versioning & lineage
  signalVersion: number;
  parentSignalId?: string;
  lineage: string[];
}

// Union type for runtime flexibility with type safety
export type ConstitutedSignal = OperationalSignal | UserContextSignal;