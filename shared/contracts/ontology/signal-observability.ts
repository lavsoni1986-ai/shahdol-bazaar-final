// shared/contracts/ontology/signal-observability.ts
// Signal Sovereignty Observability - Epistemic Governance with Separated Truth Domains

import { ConstitutedSignal, OperationalSignal, UserContextSignal, CanonicalSignal, UserIntentSignal, SignalProvenance, CanonicalSignalState } from './signals';
import { SignalSovereigntyEngine } from './signal-engine';

export interface OperationalTruthMetrics {
  totalOperationalSignals: number;
  sovereignOperationalSignals: number;
  operationalTruthDensity: number;
  operationalWeightedTruthDensity: number;
  operationalAverageConfidence: number;
  operationalProvenanceBreakdown: Record<SignalProvenance, number>;
  operationalSignalBreakdown: Record<CanonicalSignal, number>;
}

export interface UserContextMetrics {
  totalUserSignals: number;
  sovereignUserSignals: number;
  userIntentUrgencyDensity: number;
  userWeightedUrgencyDensity: number;
  userAverageConfidence: number;
  userProvenanceBreakdown: Record<SignalProvenance, number>;
  userSignalBreakdown: Record<UserIntentSignal, number>;
}

export interface SignalObservabilityMetrics {
  // Overall metrics (legacy compatibility)
  totalSignals: number;
  sovereignSignals: number;
  truthDensity: number;

  // Epistemically separated metrics
  operational: OperationalTruthMetrics;
  userContext: UserContextMetrics;

  // System health
  averageFreshnessHours: number;
  integrityIssues: Array<{signal: ConstitutedSignal, issues: string[]}>;
  assessment: {
    level: 'critical' | 'warning' | 'healthy' | 'optimal';
    assessment: string;
  };
}

export class SignalObservabilityEngine {

  // Signal importance weights (higher = more critical for truth density)
  private static readonly SIGNAL_IMPORTANCE: Record<string, number> = {
    // Operational signals
    [CanonicalSignal.EMERGENCY_SUPPORT]: 5.0, // Critical for life safety
    [CanonicalSignal.OPEN_NOW]: 3.0,          // High business impact
    [CanonicalSignal.AVAILABLE]: 2.5,         // Medium business impact
    [CanonicalSignal.DELIVERY_ACTIVE]: 2.0,   // Service continuity

    // User intent signals
    [UserIntentSignal.URGENT_NEED]: 4.0,     // High user impact
    [UserIntentSignal.IMMEDIATE_REQUIREMENT]: 3.5,
    [UserIntentSignal.TIME_SENSITIVE]: 2.0
  };

  // Provenance reliability weights
  private static readonly PROVENANCE_WEIGHT: Record<SignalProvenance, number> = {
    [SignalProvenance.VERIFIED_SCHEDULE]: 1.0,   // Maximum reliability
    [SignalProvenance.HUMAN_VERIFIED]: 0.9,     // High reliability
    [SignalProvenance.VENDOR_CLAIM]: 0.6,       // Medium reliability
    [SignalProvenance.ML_INFERENCE]: 0.4,       // Low reliability
    [SignalProvenance.HISTORICAL_PATTERN]: 0.3  // Lowest reliability
  };

  /**
   * Generate epistemically separated observability metrics
   */
  static generateMetrics(signals: ConstitutedSignal[]): SignalObservabilityMetrics {
    const now = Date.now();
    const sovereignSignals = SignalSovereigntyEngine.filterSovereignSignals(signals);

    // Separate operational and user context signals
    const operationalSignals = signals.filter(s => 'type' in s && Object.values(CanonicalSignal).includes((s as OperationalSignal).type));
    const userSignals = signals.filter(s => 'type' in s && Object.values(UserIntentSignal).includes((s as UserContextSignal).type));

    const operationalSovereign = sovereignSignals.filter(s => operationalSignals.includes(s));
    const userSovereign = sovereignSignals.filter(s => userSignals.includes(s));

    // Operational truth metrics
    const operationalMetrics: OperationalTruthMetrics = {
      totalOperationalSignals: operationalSignals.length,
      sovereignOperationalSignals: operationalSovereign.length,
      operationalTruthDensity: operationalSignals.length > 0 ? operationalSovereign.length / operationalSignals.length : 0,
      operationalWeightedTruthDensity: this.calculateWeightedDensity(operationalSignals, operationalSovereign),
      operationalAverageConfidence: operationalSignals.length > 0
        ? operationalSignals.reduce((sum, s) => sum + s.confidence, 0) / operationalSignals.length : 0,
      operationalProvenanceBreakdown: this.buildProvenanceBreakdown(operationalSignals),
      operationalSignalBreakdown: operationalSignals.reduce((acc, signal) => {
        const opSignal = signal as OperationalSignal;
        acc[opSignal.type] = (acc[opSignal.type] || 0) + 1;
        return acc;
      }, {} as Record<CanonicalSignal, number>)
    };

    // User context metrics
    const userMetrics: UserContextMetrics = {
      totalUserSignals: userSignals.length,
      sovereignUserSignals: userSovereign.length,
      userIntentUrgencyDensity: userSignals.length > 0 ? userSovereign.length / userSignals.length : 0,
      userWeightedUrgencyDensity: this.calculateWeightedDensity(userSignals, userSovereign),
      userAverageConfidence: userSignals.length > 0
        ? userSignals.reduce((sum, s) => sum + s.confidence, 0) / userSignals.length : 0,
      userProvenanceBreakdown: this.buildProvenanceBreakdown(userSignals),
      userSignalBreakdown: userSignals.reduce((acc, signal) => {
        const userSignal = signal as UserContextSignal;
        acc[userSignal.type] = (acc[userSignal.type] || 0) + 1;
        return acc;
      }, {} as Record<UserIntentSignal, number>)
    };

    // Overall metrics
    const totalSignals = signals.length;
    const truthDensity = totalSignals > 0 ? sovereignSignals.length / totalSignals : 0;
    const averageFreshnessHours = signals.length > 0
      ? signals.reduce((sum, s) => sum + ((now - s.refreshedAt) / (1000 * 60 * 60)), 0) / signals.length
      : 0;

    const integrityIssues = signals
      .map(signal => ({
        signal,
        validation: this.validateSignalIntegrity(signal)
      }))
      .filter(item => !item.validation.isValid)
      .map(item => ({
        signal: item.signal,
        issues: item.validation.issues
      }));

    return {
      totalSignals,
      sovereignSignals: sovereignSignals.length,
      truthDensity,
      operational: operationalMetrics,
      userContext: userMetrics,
      averageFreshnessHours,
      integrityIssues,
      assessment: this.assessEpistemicHealth(operationalMetrics, userMetrics)
    };
  }

  private static calculateWeightedDensity(signals: ConstitutedSignal[], sovereign: ConstitutedSignal[]): number {
    const totalWeightedImportance = signals.reduce((sum, signal) => {
      const importance = this.SIGNAL_IMPORTANCE[signal.type] || 1.0;
      const provenanceWeight = this.PROVENANCE_WEIGHT[signal.provenance] || 0.5;
      return sum + (importance * provenanceWeight);
    }, 0);

    const sovereignWeightedImportance = sovereign.reduce((sum, signal) => {
      const importance = this.SIGNAL_IMPORTANCE[signal.type] || 1.0;
      const provenanceWeight = this.PROVENANCE_WEIGHT[signal.provenance] || 0.5;
      return sum + (importance * provenanceWeight);
    }, 0);

    return totalWeightedImportance > 0 ? sovereignWeightedImportance / totalWeightedImportance : 0;
  }

  private static buildProvenanceBreakdown(signals: ConstitutedSignal[]): Record<SignalProvenance, number> {
    return signals.reduce((acc, signal) => {
      acc[signal.provenance] = (acc[signal.provenance] || 0) + 1;
      return acc;
    }, {} as Record<SignalProvenance, number>);
  }

  /**
   * Validate signal metadata integrity
   */
  static validateSignalIntegrity(signal: ConstitutedSignal): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check confidence bounds
    if (signal.confidence < 0 || signal.confidence > 1) {
      issues.push(`Invalid confidence: ${signal.confidence} (must be 0-1)`);
    }

    // Check observed timestamp is not in future (primary fact observation)

    if (signal.observedAt > Date.now() + 1000) { // Small tolerance for clock skew
      issues.push(`Future observed timestamp: ${signal.observedAt}`);
    }

    // Check TTL is reasonable
    if (signal.ttl <= 0 || signal.ttl > 86400 * 7) { // Max 7 days
      issues.push(`Invalid TTL: ${signal.ttl} seconds`);
    }

    // Check lineage exists and is reasonable length
    if (!signal.lineage || signal.lineage.length === 0) {
      issues.push('Missing signal lineage');
    } else if (signal.lineage.length > 20) {
      issues.push(`Excessive lineage length: ${signal.lineage.length}`);
    }

    // Check decay rate is reasonable
    if (signal.decayRate < 0 || signal.decayRate > 1) {
      issues.push(`Invalid decay rate: ${signal.decayRate} (must be 0-1)`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Assess weighted truth density for epistemic health
   */
  static assessTruthDensity(metrics: SignalObservabilityMetrics): {
    level: 'critical' | 'warning' | 'healthy' | 'optimal';
    assessment: string;
  } {
    return this.assessEpistemicHealth(metrics.operational, metrics.userContext);
  }

  /**
   * Assess epistemic health across operational and user context domains
   */
  static assessEpistemicHealth(operational: OperationalTruthMetrics, userContext: UserContextMetrics): {
    level: 'critical' | 'warning' | 'healthy' | 'optimal';
    assessment: string;
  } {
    // Prioritize operational truth health (more critical than user context)
    const operationalHealth = operational.operationalWeightedTruthDensity >= 0.7 &&
                             operational.operationalAverageConfidence >= 0.6;

    const userHealth = userContext.userWeightedUrgencyDensity >= 0.5 &&
                      userContext.userAverageConfidence >= 0.5;

    if (operationalHealth && userHealth) {
      return {
        level: 'optimal',
        assessment: 'Epistemic governance optimal - strong operational truth and user context alignment'
      };
    }

    if (operationalHealth) {
      return {
        level: 'healthy',
        assessment: 'Epistemic governance healthy - operational truth strong, user context adequate'
      };
    }

    if (operational.operationalWeightedTruthDensity >= 0.4) {
      return {
        level: 'warning',
        assessment: 'Epistemic governance warning - operational truth declining, monitor closely'
      };
    }

    return {
      level: 'critical',
      assessment: 'Epistemic governance critical - operational truth compromised, immediate intervention required'
    };
  }

  /**
   * Monitor signal ecosystem health
   */
  static monitorSignalHealth(signals: ConstitutedSignal[]): {
    metrics: SignalObservabilityMetrics;
    assessment: ReturnType<typeof SignalObservabilityEngine.assessTruthDensity>;
    integrityIssues: Array<{signal: ConstitutedSignal, issues: string[]}>;
  } {
    const metrics = this.generateMetrics(signals);
    const assessment = this.assessTruthDensity(metrics);

    const integrityIssues = signals
      .map(signal => ({
        signal,
        validation: this.validateSignalIntegrity(signal)
      }))
      .filter(item => !item.validation.isValid)
      .map(item => ({
        signal: item.signal,
        issues: item.validation.issues
      }));

    return {
      metrics,
      assessment,
      integrityIssues
    };
  }
}