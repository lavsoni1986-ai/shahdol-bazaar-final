/**
 * VENDOR TRUST AGGREGATION LAYER
 * BharatOS Phase 6 - Adaptive Trust & Ranking Foundation
 *
 * Aggregates trust signals for vendors across execution patterns.
 * Foundation for execution-weighted trust scoring.
 */

import { ExecutionSignal, VendorReliabilitySignal } from '../../execution/types';
import { TrustSignal, TrustSignalType } from '../../ranking/types';

export interface VendorTrustAggregator {
  // Core aggregation
  aggregateVendorTrust(vendorId: number, districtId: number, timeWindow: { start: number; end: number }): Promise<VendorTrustProfile>;

  // Signal processing
  processExecutionSignal(signal: ExecutionSignal): Promise<void>;
  processTrustSignal(signal: TrustSignal): Promise<void>;

  // Trust calculation components
  calculateExecutionTrust(vendorId: number, districtId: number, timeWindow: { start: number; end: number }): Promise<ExecutionTrustMetrics>;
  calculateLocalityTrust(vendorId: number, districtId: number, timeWindow: { start: number; end: number }): Promise<LocalityTrustMetrics>;
  calculateTemporalTrust(vendorId: number, districtId: number, timeWindow: { start: number; end: number }): Promise<TemporalTrustMetrics>;

  // Trust evolution
  getTrustEvolution(vendorId: number, districtId: number, periods: number): Promise<TrustEvolution[]>;
  predictTrustTrend(vendorId: number, districtId: number): Promise<TrustPrediction>;
}

export interface VendorTrustProfile {
  vendorId: number;
  districtId: number;
  timeWindow: { start: number; end: number };

  // Base trust components
  baseTrust: {
    dsslScore: number;
    rating: number;
    reviewCount: number;
    accountAge: number;
  };

  // Execution trust components
  executionTrust: {
    totalExecutions: number;
    successfulExecutions: number;
    repeatedExecutions: number;
    successRate: number; // 0-1
    retentionRate: number; // repeat user ratio
    responseConsistency: number; // 0-1
  };

  // Failure trust components
  failureTrust: {
    ignoredRecommendations: number;
    abandonedInteractions: number;
    failedGrounding: number;
    unresolvedQueries: number;
    failureRate: number; // 0-1
    recoveryRate: number; // ability to recover from failures
  };

  // Locality trust components
  localityTrust: {
    primaryLocalities: string[];
    localityPerformance: Record<string, {
      executions: number;
      successRate: number;
      trustScore: number;
    }>;
    localityCoverage: number; // 0-1
    demandAlignment: number; // 0-1
  };

  // Temporal trust components
  temporalTrust: {
    peakHours: number[];
    consistentPerformance: number; // 0-1
    reliabilityTrend: 'improving' | 'stable' | 'declining';
    seasonalAdaptability: number; // 0-1
  };

  // Overall trust score
  overallTrust: {
    score: number; // 0-1
    confidence: number; // 0-1
    components: {
      base: number;
      execution: number;
      failure: number;
      locality: number;
      temporal: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };

  metadata: {
    lastCalculated: number;
    dataPoints: number;
    signalCount: number;
    trustStability: number; // how stable the trust score is
  };
}

export interface ExecutionTrustMetrics {
  vendorId: number;
  totalInteractions: number;
  successfulInteractions: number;
  repeatedInteractions: number;

  // Success metrics
  successRate: number; // successful/total
  conversionRate: number; // actions taken / recommendations shown
  completionRate: number; // fully completed interactions

  // Retention metrics
  repeatUserRate: number; // repeat users / total users
  sessionRetention: number; // multi-action sessions
  longTermRetention: number; // users returning after 30 days

  // Responsiveness metrics
  averageResponseTime: number; // in milliseconds
  responseConsistency: number; // standard deviation of response times
  peakHourPerformance: number; // performance during busy times

  // Reliability metrics
  uptimeScore: number; // availability during business hours
  consistencyScore: number; // performance consistency over time
  predictabilityScore: number; // how predictable the vendor's performance is
}

export interface LocalityTrustMetrics {
  vendorId: number;

  // Geographic coverage
  coveredLocalities: string[];
  primaryLocality: string;
  coverageRadius: number; // in meters

  // Locality performance
  localityPerformance: Record<string, {
    interactions: number;
    successRate: number;
    averageResponseTime: number;
    userSatisfaction: number;
  }>;

  // Demand alignment
  demandAlignment: Record<string, number>; // locality -> alignment score 0-1
  underservedAreas: string[]; // areas with high demand but low performance
  opportunityAreas: string[]; // areas with potential for expansion

  // Competition context
  competitionLevel: Record<string, number>; // locality -> competition score 0-1
  marketPosition: Record<string, 'leader' | 'challenger' | 'follower' | 'niche'>;

  // Trust distribution
  trustDensity: Record<string, number>; // locality -> trust concentration 0-1
  trustHotspots: string[]; // areas with highest trust
  trustColdspots: string[]; // areas with lowest trust
}

export interface TemporalTrustMetrics {
  vendorId: number;

  // Time-based performance
  performanceByHour: Record<number, {
    interactions: number;
    successRate: number;
    averageResponseTime: number;
  }>;

  performanceByDay: Record<number, {
    interactions: number;
    successRate: number;
    averageResponseTime: number;
  }>;

  // Consistency metrics
  performanceConsistency: number; // 0-1, how consistent across time periods
  peakPerformanceHours: number[];
  lowPerformanceHours: number[];

  // Trend analysis
  performanceTrend: 'improving' | 'stable' | 'declining';
  trendMagnitude: number; // rate of change
  seasonalPatterns: Record<string, number>; // season -> performance multiplier

  // Reliability over time
  uptimeHistory: Array<{
    timestamp: number;
    available: boolean;
    responseTime: number;
  }>;

  reliabilityScore: number; // 0-1, overall temporal reliability
  predictabilityScore: number; // 0-1, how predictable performance is
}

export interface TrustEvolution {
  vendorId: number;
  districtId: number;
  period: {
    start: number;
    end: number;
    label: string; // e.g., "2024-W01", "2024-01"
  };

  trustScore: number;
  componentScores: {
    base: number;
    execution: number;
    failure: number;
    locality: number;
    temporal: number;
  };

  keyEvents: Array<{
    timestamp: number;
    event: string;
    impact: number; // -1 to 1
    description: string;
  }>;

  performanceMetrics: {
    interactions: number;
    successRate: number;
    retentionRate: number;
    averageResponseTime: number;
  };
}

export interface TrustPrediction {
  vendorId: number;
  districtId: number;

  currentTrust: number;
  predictedTrust: number; // next period prediction
  confidence: number; // 0-1

  trend: {
    direction: 'improving' | 'stable' | 'declining';
    magnitude: number;
    timeHorizon: number; // in days
  };

  factors: Array<{
    factor: string;
    currentImpact: number;
    predictedImpact: number;
    confidence: number;
  }>;

  recommendations: Array<{
    action: string;
    potentialImpact: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeline: string;
  }>;

  riskFactors: Array<{
    risk: string;
    probability: number;
    potentialImpact: number;
    mitigation: string;
  }>;
}

// Trust scoring weights and thresholds
export interface TrustScoringConfig {
  weights: {
    base: number; // 0-1
    execution: number; // 0-1
    failure: number; // 0-1
    locality: number; // 0-1
    temporal: number; // 0-1
  };

  thresholds: {
    minimumDataPoints: number;
    minimumTimeWindow: number; // in days
    trustGradeBoundaries: {
      A: number; // 0-1
      B: number;
      C: number;
      D: number;
    };
  };

  penalties: {
    failureRatePenalty: number;
    inconsistencyPenalty: number;
    lowActivityPenalty: number;
  };

  bonuses: {
    highRetentionBonus: number;
    localitySpecializationBonus: number;
    temporalConsistencyBonus: number;
  };
}