/**
 * EXECUTION-WEIGHTED RANKING ARCHITECTURE PREPARATION
 * BharatOS Phase 4 - Execution Intelligence Foundation
 *
 * Preparation for future ranking system that incorporates execution intelligence.
 * NO ranking logic changes in this phase.
 */

export interface ExecutionWeightedRankingConfig {
  enabled: boolean; // Feature flag for gradual rollout
  weightFactors: {
    interactionVolume: number;     // 0-1, how much interaction volume matters
    conversionQuality: number;     // 0-1, how much successful conversions matter
    temporalConsistency: number;   // 0-1, how much consistent timing matters
    userRetention: number;         // 0-1, how much repeat user behavior matters
  };
  minimumDataThreshold: {
    minInteractions: number;       // Minimum interactions needed for weighting
    minDays: number;              // Minimum days of data needed
    minConversionRate: number;    // Minimum conversion rate for reliability
  };
  executionMultiplier: {
    baseMultiplier: number;        // Default multiplier (1.0)
    maxMultiplier: number;         // Maximum boost possible
    minMultiplier: number;         // Minimum penalty possible
  };
}

export interface RankingExecutionFactors {
  vendorId: number;
  districtId: number;

  // Interaction volume (scale: 0-1)
  interactionVolume: number;

  // Conversion quality (scale: 0-1)
  conversionQuality: number;

  // Temporal consistency (scale: 0-1)
  temporalConsistency: number;

  // User retention (scale: 0-1)
  userRetention: number;

  // Combined execution score (scale: 0-1)
  executionScore: number;

  // Final multiplier for ranking
  rankingMultiplier: number;
}

/**
 * Future ranking calculation (NOT implemented yet)
 */
export function calculateExecutionWeightedScore(
  baseScore: number,
  executionFactors: RankingExecutionFactors,
  config: ExecutionWeightedRankingConfig
): number {
  // This will be implemented in Phase 5
  // For now, return base score unchanged
  return baseScore;
}

/**
 * Data readiness check for execution-weighted ranking
 */
export function isVendorReadyForExecutionWeighting(
  metrics: VendorInteractionMetrics,
  config: ExecutionWeightedRankingConfig
): boolean {
  const hasMinInteractions = metrics.totalInteractions >= config.minimumDataThreshold.minInteractions;
  const hasMinDays = (
    (Date.now() - metrics.recentInteractions[0]?.timestamp || 0) /
    (1000 * 60 * 60 * 24)
  ) >= config.minimumDataThreshold.minDays;

  // Additional checks will be added in Phase 5
  return hasMinInteractions && hasMinDays;
}