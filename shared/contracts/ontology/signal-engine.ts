// shared/contracts/ontology/signal-engine.ts
// Signal Sovereignty Engine - Epistemic Governance & Provenance-Aware Decay

import { ConstitutedSignal, OperationalSignal, UserContextSignal, CanonicalSignal, OperationalSignalType, UserIntentSignal, CanonicalSignalState, SignalProvenance } from './signals';

// Deterministic immutable signal ID generation for constitutional lineage
function generateSignalId(type: string, version: number, createdAt: number): string {
  // Use deterministic hash of constitutional parameters for immutable identity
  const input = `${type}:${version}:${createdAt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const deterministicId = Math.abs(hash).toString(36);
  return `${type}_v${version}_${createdAt}_${deterministicId}`;
}

export class SignalSovereigntyEngine {

  // Freshness decay configuration per signal type (per HOUR decay rate)
  private static readonly DECAY_RATES_PER_HOUR: Record<string, number> = {
    // Canonical operational signals
    [CanonicalSignal.OPEN_NOW]: 0.3,        // Fast decay - business hours change significantly
    [CanonicalSignal.AVAILABLE]: 0.15,      // Medium decay - availability fluctuates
    [CanonicalSignal.EMERGENCY_SUPPORT]: 0.02, // Slow decay - emergency capability rarely changes
    [CanonicalSignal.DELIVERY_ACTIVE]: 0.25, // Medium-fast decay - delivery status changes

    // Extended operational signal types (expectations)
    [OperationalSignalType.EXPECTED_OPEN_NOW]: 0.4,        // Faster decay - expectations are speculative
    [OperationalSignalType.EXPECTED_AVAILABLE]: 0.2,       // Medium decay - expectations fluctuate
    [OperationalSignalType.EXPECTED_EMERGENCY_SUPPORT]: 0.05, // Slow decay - emergency expectations persist
    [OperationalSignalType.EXPECTED_DELIVERY_ACTIVE]: 0.3, // Medium-fast decay - delivery expectations

    // User intent signals (different decay characteristics)
    [UserIntentSignal.URGENT_NEED]: 0.1,   // Medium decay - user urgency persists longer
    [UserIntentSignal.IMMEDIATE_REQUIREMENT]: 0.2,
    [UserIntentSignal.TIME_SENSITIVE]: 0.15
  };

  // TTL configuration (Time-to-Live in seconds)
  private static readonly TTL_CONFIG: Record<string, number> = {
    // Canonical operational signals
    [CanonicalSignal.OPEN_NOW]: 3600,       // 1 hour
    [CanonicalSignal.AVAILABLE]: 1800,      // 30 minutes
    [CanonicalSignal.EMERGENCY_SUPPORT]: 86400, // 24 hours
    [CanonicalSignal.DELIVERY_ACTIVE]: 3600, // 1 hour

    // Extended operational signal types (expectations)
    [OperationalSignalType.EXPECTED_OPEN_NOW]: 1800,       // 30 minutes - expectations are short-lived
    [OperationalSignalType.EXPECTED_AVAILABLE]: 900,       // 15 minutes - highly speculative
    [OperationalSignalType.EXPECTED_EMERGENCY_SUPPORT]: 7200, // 2 hours - emergency expectations persist longer
    [OperationalSignalType.EXPECTED_DELIVERY_ACTIVE]: 1800, // 30 minutes - delivery expectations

    // User intent signals
    [UserIntentSignal.URGENT_NEED]: 7200,  // 2 hours - user urgency context
    [UserIntentSignal.IMMEDIATE_REQUIREMENT]: 3600,
    [UserIntentSignal.TIME_SENSITIVE]: 1800
  };

  // Provenance confidence base scores
  private static readonly PROVENANCE_CONFIDENCE: Record<SignalProvenance, number> = {
    [SignalProvenance.VERIFIED_SCHEDULE]: 0.95,   // High confidence
    [SignalProvenance.HUMAN_VERIFIED]: 0.90,     // High confidence
    [SignalProvenance.VENDOR_CLAIM]: 0.70,       // Medium confidence
    [SignalProvenance.ML_INFERENCE]: 0.60,       // Medium-low confidence
    [SignalProvenance.HISTORICAL_PATTERN]: 0.50  // Low confidence
  };

  /**
   * Create a constituted signal with full sovereignty metadata
   */
  static constituteOperationalSignal(
    type: CanonicalSignal | OperationalSignalType,
    initialState: CanonicalSignalState,
    provenance: SignalProvenance,
    source: string,
    observedAt?: number,
    lineage: string[] = []
  ): OperationalSignal {
    const now = Date.now();
    const baseConfidence = this.PROVENANCE_CONFIDENCE[provenance];
    const ttlValue = this.TTL_CONFIG[type] || 3600;

    return {
      type,
      state: initialState,
      createdAt: now,
      observedAt: observedAt || now,
      refreshedAt: now,
      evaluatedAt: now,
      confidence: baseConfidence,
      source,
      provenance,
      verification: this.getVerificationLevel(provenance),
      decayRate: this.DECAY_RATES_PER_HOUR[type],
      ttl: ttlValue,
      signalVersion: 1,
      parentSignalId: undefined, // Root signal has no parent
      lineage: lineage.length > 0 ? lineage : [`constituted_${generateSignalId(type, 1, now)}`]
    };
  }

  static constituteUserContextSignal(
    type: UserIntentSignal,
    initialState: CanonicalSignalState,
    provenance: SignalProvenance,
    source: string,
    observedAt?: number,
    lineage: string[] = []
  ): UserContextSignal {
    const now = Date.now();
    const baseConfidence = this.PROVENANCE_CONFIDENCE[provenance];

    return {
      type,
      state: initialState,
      createdAt: now,
      observedAt: observedAt || now,
      refreshedAt: now,
      evaluatedAt: now,
      confidence: baseConfidence,
      source,
      provenance,
      verification: this.getVerificationLevel(provenance),
      decayRate: this.DECAY_RATES_PER_HOUR[type],
      ttl: this.TTL_CONFIG[type],
      signalVersion: 1,
      parentSignalId: undefined, // Root signal has no parent
      lineage: lineage.length > 0 ? lineage : [`constituted_${generateSignalId(type, 1, now)}`]
    };
  }

  /**
   * Apply epistemic freshness decay (NON-MUTATING, provenance-aware)
   * Returns signal with evaluated confidence at current time
   */
  static applyFreshnessDecay(signal: ConstitutedSignal): ConstitutedSignal {
    const evaluatedAt = Date.now();
    const ageHours = (evaluatedAt - signal.refreshedAt) / (1000 * 60 * 60);

    // Provenance-aware decay with absolute freshness ceilings
    let decayedConfidence: number;
    const ageDays = ageHours / 24; // Convert to days for ceiling logic

    if (signal.verification === 'verified') {
      // Verified signals have confidence floor but absolute freshness ceiling
      if (ageDays <= 7) {
        // Within 7 days: slower decay with minimum confidence floor
        decayedConfidence = Math.max(
          signal.confidence * Math.exp(-signal.decayRate * ageHours * 0.5),
          0.7 // Minimum confidence floor for recent verified signals
        );
      } else {
        // Beyond 7 days: normal decay, no confidence floor
        decayedConfidence = signal.confidence * Math.exp(-signal.decayRate * ageHours);
        // Additional penalty for very old verified signals
        if (ageDays > 30) {
          decayedConfidence *= 0.8; // 20% additional penalty for month-old verified signals
        }
      }
    } else if (signal.provenance === SignalProvenance.HISTORICAL_PATTERN) {
      // Historical patterns decay faster but can be reinforced
      decayedConfidence = signal.confidence * Math.exp(-signal.decayRate * ageHours * 1.5);
    } else {
      // Standard exponential decay for other provenances
      decayedConfidence = signal.confidence * Math.exp(-signal.decayRate * ageHours);
    }

    // Update state based on epistemic decay
    let newState = signal.state;
    if (ageHours * 3600 > signal.ttl) {
      newState = CanonicalSignalState.STALE;
    } else if (decayedConfidence < 0.3) {
      newState = CanonicalSignalState.UNVERIFIED;
    }

    // Return with updated evaluation timestamp (non-mutating of source timestamps)
    return {
      ...signal,
      confidence: Math.max(0, decayedConfidence),
      state: newState,
      evaluatedAt: Date.now() // Update evaluation timestamp constitutionally
    };
  }

  /**
   * Check if signal is still sovereign (fresh and confident enough)
   */
  static isSignalSovereign(signal: ConstitutedSignal): boolean {
    const decayed = this.applyFreshnessDecay(signal);
    return decayed.state !== CanonicalSignalState.STALE &&
           decayed.state !== CanonicalSignalState.UNVERIFIED &&
           decayed.confidence > 0.4;
  }

  /**
   * Update signal constitutionally with new information (immutable versioning)
   */
  static updateSignal(
    signal: ConstitutedSignal,
    newState: CanonicalSignalState,
    newProvenance: SignalProvenance,
    newSource: string,
    newObservedAt?: number
  ): ConstitutedSignal {
    const now = Date.now();
    const newConfidence = this.PROVENANCE_CONFIDENCE[newProvenance];
    const updateId = `${signal.type}_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate current signal's immutable ID for parent reference
    const currentSignalId = generateSignalId(signal.type, signal.signalVersion, signal.createdAt);

    return {
      ...signal,
      state: newState,
      confidence: newConfidence,
      observedAt: newObservedAt || signal.observedAt,
      refreshedAt: now, // Constitutional refresh timestamp
      evaluatedAt: now, // Fresh evaluation
      source: newSource,
      provenance: newProvenance,
      verification: this.getVerificationLevel(newProvenance),
      signalVersion: signal.signalVersion + 1, // Immutable version increment
      parentSignalId: currentSignalId, // Point to immediate parent, not root
      lineage: [...signal.lineage, `updated_${updateId}_${newProvenance}`]
    };
  }

  /**
   * Get verification level from provenance
   */
  private static getVerificationLevel(provenance: SignalProvenance): 'verified' | 'unverified' | 'inferred' {
    switch (provenance) {
      case SignalProvenance.VERIFIED_SCHEDULE:
      case SignalProvenance.HUMAN_VERIFIED:
        return 'verified';
      case SignalProvenance.VENDOR_CLAIM:
        return 'unverified';
      case SignalProvenance.ML_INFERENCE:
      case SignalProvenance.HISTORICAL_PATTERN:
        return 'inferred';
      default:
        return 'unverified';
    }
  }

  /**
   * Batch process signals for sovereignty (single decay application)
   */
  static filterSovereignSignals(signals: ConstitutedSignal[]): ConstitutedSignal[] {
    return signals
      .map(signal => this.applyFreshnessDecay(signal))
      .filter(signal => signal.state !== CanonicalSignalState.STALE &&
                        signal.state !== CanonicalSignalState.UNVERIFIED &&
                        signal.confidence > 0.4);
  }
}