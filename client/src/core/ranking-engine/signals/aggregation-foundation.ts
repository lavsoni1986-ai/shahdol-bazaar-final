/**
 * SIGNAL AGGREGATION FOUNDATION
 * BharatOS Phase 6 - Adaptive Trust & Ranking Foundation
 *
 * Foundation for collecting and aggregating ranking signals.
 * NO production scoring changes yet.
 */

import { RankingSignal, RankingSignalType, TrustSignal, TrustSignalType } from '../ranking/types';

export interface SignalAggregator {
  // Signal collection
  collectSignal(signal: RankingSignal): Promise<void>;
  collectTrustSignal(signal: TrustSignal): Promise<void>;

  // Aggregation methods
  aggregateVendorSignals(vendorId: number, districtId: number, timeWindow: { start: number; end: number }): Promise<VendorSignalAggregation>;
  aggregateCategorySignals(category: string, districtId: number, timeWindow: { start: number; end: number }): Promise<CategorySignalAggregation>;
  aggregateLocalitySignals(locality: string, districtId: number, timeWindow: { start: number; end: number }): Promise<LocalitySignalAggregation>;

  // Signal analysis
  getSignalTrends(vendorId: number, signalType: RankingSignalType, days: number): Promise<SignalTrend[]>;
  getSignalCorrelations(vendorId: number, signalTypes: RankingSignalType[]): Promise<SignalCorrelation[]>;

  // Data management
  pruneOldSignals(thresholdDays: number): Promise<number>;
  getSignalHealth(): Promise<SignalHealthMetrics>;
}

export interface VendorSignalAggregation {
  vendorId: number;
  districtId: number;
  timeWindow: { start: number; end: number };

  semanticSignals: {
    count: number;
    averageRelevance: number;
    topQueries: string[];
  };

  trustSignals: {
    dsslScore: number;
    executionSuccess: number;
    repeatInteraction: number;
    failureRate: number;
    overallTrust: number;
  };

  executionSignals: {
    totalExecutions: number;
    successfulExecutions: number;
    repeatUsers: number;
    averageResponseTime: number;
    executionConsistency: number;
  };

  localitySignals: {
    primaryLocalities: string[];
    localityTrust: Record<string, number>;
    demandAlignment: number;
  };

  demandSignals: {
    queryFrequency: number;
    categoryDemand: number;
    temporalDemand: Record<string, number>;
  };

  metadata: {
    totalSignals: number;
    signalTypes: Record<RankingSignalType, number>;
    lastUpdated: number;
    confidence: number;
  };
}

export interface CategorySignalAggregation {
  category: string;
  districtId: number;
  timeWindow: { start: number; end: number };

  marketSignals: {
    activeVendors: number;
    averageTrust: number;
    competitionLevel: number;
    demandIntensity: number;
  };

  executionSignals: {
    totalCategoryExecutions: number;
    successfulRate: number;
    userRetention: number;
    averageSatisfaction: number;
  };

  trustSignals: {
    categoryTrustDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    trustVolatility: number;
    reliabilityTrend: 'improving' | 'stable' | 'declining';
  };

  localitySignals: {
    localityCoverage: Record<string, number>;
    underservedAreas: string[];
    demandHotspots: string[];
  };
}

export interface LocalitySignalAggregation {
  locality: string;
  districtId: number;
  timeWindow: { start: number; end: number };

  demandSignals: {
    dominantCategories: string[];
    peakDemandTimes: string[];
    demandVolatility: number;
    unmetDemand: number;
  };

  trustSignals: {
    trustedVendors: Array<{ vendorId: number; trustScore: number }>;
    trustDensity: number;
    reliabilityHotspots: string[];
  };

  executionSignals: {
    totalLocalExecutions: number;
    successfulLocalRate: number;
    frequentActions: string[];
    userSatisfaction: number;
  };

  vendorSignals: {
    activeVendors: number;
    averageVendorTrust: number;
    serviceCoverage: number;
    competitionIndex: number;
  };
}

export interface SignalTrend {
  signalType: RankingSignalType;
  vendorId: number;
  period: string; // 'daily' | 'weekly' | 'monthly'
  dataPoints: Array<{
    timestamp: number;
    value: number;
    confidence: number;
  }>;
  trend: {
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number;
    significance: number;
    prediction: number; // next period prediction
  };
}

export interface SignalCorrelation {
  signalTypes: [RankingSignalType, RankingSignalType];
  vendorId: number;
  correlation: {
    coefficient: number; // -1 to 1
    strength: 'weak' | 'moderate' | 'strong';
    significance: number; // p-value like
    timeLag: number; // if applicable
  };
  evidence: {
    dataPoints: number;
    timeWindow: { start: number; end: number };
    confidence: number;
  };
}

export interface SignalHealthMetrics {
  totalSignals: number;
  signalsByType: Record<RankingSignalType, number>;
  averageSignalAge: number; // in hours
  signalQuality: {
    highConfidence: number; // percentage
    lowConfidence: number; // percentage
    corrupted: number; // percentage
  };
  processingMetrics: {
    averageProcessingTime: number; // in ms
    failureRate: number;
    queueDepth: number;
  };
  storageMetrics: {
    totalSize: number; // in MB
    retentionRate: number; // percentage kept
    compressionRatio: number;
  };
}

// Signal processing pipeline
export interface SignalPipeline {
  // Input validation
  validateSignal(signal: RankingSignal): boolean;

  // Signal enrichment
  enrichSignal(signal: RankingSignal): Promise<RankingSignal>;

  // Signal normalization
  normalizeSignal(signal: RankingSignal): RankingSignal;

  // Signal deduplication
  deduplicateSignal(signal: RankingSignal, existingSignals: RankingSignal[]): boolean;

  // Signal storage
  storeSignal(signal: RankingSignal): Promise<void>;

  // Batch processing
  processSignalBatch(signals: RankingSignal[]): Promise<void>;
}

export interface SignalWeights {
  semantic: {
    baseWeight: number;
    queryRelevance: number;
    categoryMatch: number;
    temporalRelevance: number;
  };

  trust: {
    dsslBase: number;
    executionSuccess: number;
    repeatUsage: number;
    failurePenalty: number;
  };

  execution: {
    frequency: number;
    successRate: number;
    retention: number;
    responsiveness: number;
  };

  locality: {
    relevance: number;
    trust: number;
    demandFit: number;
    competition: number;
  };

  relevance: {
    userHistory: number;
    categoryPreference: number;
    temporalPattern: number;
    socialProof: number;
  };
}