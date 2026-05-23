/**
 * INTELLIGENCE AGGREGATION SERVICES
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Services for aggregating intelligence from cognition, execution, trust, locality, demand, and ranking signals
 */

import { IntelligenceAggregation } from '../../shared/district-intelligence/types';

export interface IntelligenceAggregator {
  // Core aggregation
  aggregateIntelligence(districtId: number, timeWindow: { start: number; end: number }): Promise<IntelligenceAggregation>;

  // Signal source aggregation
  aggregateCognitionSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<CognitionAggregation>;
  aggregateExecutionSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<ExecutionAggregation>;
  aggregateTrustSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<TrustAggregation>;
  aggregateLocalitySignals(districtId: number, timeWindow: { start: number; end: number }): Promise<LocalityAggregation>;
  aggregateDemandSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<DemandAggregation>;
  aggregateRankingSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<RankingAggregation>;

  // Cross-signal correlation
  correlateSignals(districtId: number, timeWindow: { start: number; end: number }): Promise<SignalCorrelations>;

  // Intelligence quality assessment
  assessIntelligenceQuality(aggregation: IntelligenceAggregation): Promise<IntelligenceQuality>;
}

export interface CognitionAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  queries: {
    total: number;
    byCategory: Record<string, number>;
    byIntent: Record<string, number>;
    averageLength: number;
    complexityScore: number; // 0-1, how complex queries are
  };

  parsing: {
    successRate: number; // percentage successfully parsed
    confidence: number; // average parsing confidence
    fallbackRate: number; // percentage using fallbacks
    ambiguityRate: number; // percentage ambiguous queries
  };

  cognition: {
    entities: Record<string, number>; // entity type -> count
    relations: Record<string, number>; // relation type -> count
    insights: number; // cognition-generated insights
    patterns: string[]; // detected patterns
  };

  performance: {
    averageProcessingTime: number; // in ms
    cacheHitRate: number; // 0-1
    errorRate: number;
  };
}

export interface ExecutionAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  actions: {
    total: number;
    byType: Record<string, number>;
    byOutcome: Record<string, number>; // success, failure, timeout, etc.
    byVendor: Record<number, number>;
    byLocality: Record<string, number>;
  };

  performance: {
    successRate: number; // 0-1
    averageResponseTime: number; // in ms
    completionRate: number; // 0-1
    userSatisfaction: number; // 0-1
  };

  patterns: {
    frequentSequences: Array<{
      sequence: string[];
      frequency: number;
      successRate: number;
    }>;
    peakHours: number[];
    peakDays: number[];
    seasonalPatterns: Record<string, number>;
  };

  reliability: {
    vendorReliability: Record<number, number>; // vendorId -> reliability score
    localityReliability: Record<string, number>; // locality -> reliability score
    actionReliability: Record<string, number>; // actionType -> reliability score
  };
}

export interface TrustAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  scores: {
    average: number; // 0-1
    distribution: {
      high: number; // count of high-trust entities
      medium: number;
      low: number;
    };
    volatility: number; // how much trust changes
    concentration: number; // how concentrated high trust is
  };

  signals: {
    total: number;
    byType: Record<string, number>; // trust signal type -> count
    bySource: Record<string, number>; // signal source -> count
    averageConfidence: number; // 0-1
  };

  evolution: {
    improving: number; // count of improving trust scores
    declining: number; // count of declining trust scores
    stable: number; // count of stable trust scores
    trend: 'improving' | 'declining' | 'stable';
  };

  insights: {
    topPerformers: Array<{
      entityId: number;
      entityType: 'vendor' | 'category';
      trustScore: number;
      improvement: number;
    }>;
    concerning: Array<{
      entityId: number;
      entityType: 'vendor' | 'category';
      trustScore: number;
      issues: string[];
    }>;
  };
}

export interface LocalityAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  coverage: {
    activeLocalities: number;
    totalLocalities: number;
    coverageRate: number; // 0-1
    underservedAreas: string[];
  };

  activity: {
    totalActivity: number;
    byLocality: Record<string, number>;
    averageActivity: number;
    activityDistribution: {
      high: number; // count of high-activity localities
      medium: number;
      low: number;
    };
  };

  intelligence: {
    trustDensity: Record<string, number>; // locality -> average trust
    demandIntensity: Record<string, number>; // locality -> demand level
    executionSuccess: Record<string, number>; // locality -> success rate
    serviceGaps: Record<string, string[]>; // locality -> missing categories
  };

  patterns: {
    emergingLocalities: string[]; // localities showing growth
    decliningLocalities: string[]; // localities showing decline
    specialtyAreas: Record<string, string[]>; // locality -> dominant categories
  };
}

export interface DemandAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  volume: {
    totalDemand: number;
    byCategory: Record<string, number>;
    byLocality: Record<string, number>;
    byTimeOfDay: Record<number, number>; // hour -> demand count
    growthRate: number; // percentage change
  };

  fulfillment: {
    satisfiedDemand: number;
    unmetDemand: number;
    satisfactionRate: number; // 0-1
    averageFulfillmentTime: number; // in minutes
  };

  patterns: {
    seasonalDemand: Record<string, number>; // season -> demand multiplier
    peakDemand: {
      hours: number[];
      days: number[];
      categories: string[];
    };
    demandClusters: Array<{
      center: { lat: number; lng: number };
      radius: number;
      category: string;
      intensity: number;
    }>;
  };

  insights: {
    risingDemand: Array<{
      category: string;
      growthRate: number;
      localities: string[];
    }>;
    unmetNeeds: Array<{
      category: string;
      locality: string;
      severity: number;
    }>;
  };
}

export interface RankingAggregation {
  districtId: number;
  timeWindow: { start: number; end: number };

  rankings: {
    totalCalculated: number;
    averageScore: number; // 0-1
    scoreDistribution: {
      excellent: number; // count
      good: number;
      fair: number;
      poor: number;
    };
  };

  signals: {
    totalSignals: number;
    byType: Record<string, number>; // ranking signal type -> count
    averageWeight: number; // average signal weight
    signalQuality: number; // 0-1
  };

  performance: {
    averageRankingTime: number; // in ms
    cacheHitRate: number; // 0-1
    rankingStability: number; // how consistent rankings are
    userSatisfaction: number; // estimated from ranking outcomes
  };

  adaptation: {
    signalsProcessed: number;
    weightsUpdated: number;
    modelImprovements: number;
    feedbackIncorporated: number;
  };
}

export interface SignalCorrelations {
  districtId: number;
  timeWindow: { start: number; end: number };

  correlations: Array<{
    signalA: string;
    signalB: string;
    coefficient: number; // -1 to 1
    strength: 'weak' | 'moderate' | 'strong';
    significance: number; // p-value
    lag: number; // time lag in hours, if applicable
  }>;

  insights: {
    causalRelationships: Array<{
      cause: string;
      effect: string;
      strength: number;
      confidence: number;
    }>;
    predictiveSignals: Array<{
      predictor: string;
      outcome: string;
      accuracy: number;
      leadTime: number; // in hours
    }>;
    redundantSignals: string[]; // signals that don't add unique information
  };

  network: {
    nodes: Array<{
      id: string;
      type: 'cognition' | 'execution' | 'trust' | 'locality' | 'demand' | 'ranking';
      centrality: number; // importance in the network
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
      direction: 'directed' | 'undirected';
    }>;
  };
}

export interface IntelligenceQuality {
  aggregation: IntelligenceAggregation;

  quality: {
    overall: number; // 0-1
    dataCompleteness: number; // percentage of expected data present
    signalQuality: number; // average signal confidence
    temporalCoverage: number; // how well time periods are covered
    spatialCoverage: number; // geographic coverage
  };

  issues: {
    dataGaps: string[]; // missing data areas
    qualityIssues: string[]; // low quality data areas
    temporalGaps: string[]; // time periods with missing data
    outlierSignals: number; // percentage of outlier signals
  };

  recommendations: Array<{
    area: string;
    issue: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    expectedImprovement: number;
  }>;

  metadata: {
    assessed: number;
    assessmentMethod: string;
    confidence: number;
  };
}

// Aggregation configuration
export interface AggregationConfig {
  enabled: boolean;
  schedule: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    batchSize: number;
    maxProcessingTime: number; // in minutes
  };

  sources: {
    cognition: boolean;
    execution: boolean;
    trust: boolean;
    locality: boolean;
    demand: boolean;
    ranking: boolean;
  };

  quality: {
    minimumConfidence: number; // 0-1
    outlierThreshold: number; // standard deviations
    minimumDataPoints: number;
    dataFreshness: number; // maximum age in hours
  };

  storage: {
    retentionPeriod: number; // days
    compressionEnabled: boolean;
    indexingEnabled: boolean;
  };

  alerting: {
    enabled: boolean;
    qualityThreshold: number; // minimum quality score
    gapThreshold: number; // maximum data gap percentage
  };
}