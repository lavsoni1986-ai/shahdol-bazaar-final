/**
 * DISTRICT INTELLIGENCE TYPES
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Core types for district observability and operational intelligence
 */

export interface DistrictInsight {
  id: string;
  type: InsightType;
  districtId: number;
  title: string;
  summary: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  priority: number; // 1-10, higher = more important
  category: string;
  locality?: string;
  timeWindow: {
    start: number;
    end: number;
  };
  metrics: Record<string, any>;
  recommendations: InsightRecommendation[];
  metadata: {
    generated: number;
    dataPoints: number;
    signalsUsed: number;
    expires?: number; // when insight becomes stale
  };
}

export type InsightType =
  | 'demand_rising'
  | 'demand_falling'
  | 'failure_repeated'
  | 'shortage_locality'
  | 'trust_concentration'
  | 'execution_success_cluster'
  | 'emergency_activity'
  | 'category_growth'
  | 'vendor_reliability'
  | 'locality_trend';

export interface InsightRecommendation {
  type: 'expand_service' | 'reduce_capacity' | 'improve_quality' | 'target_locality' | 'increase_coverage' | 'monitor_trend';
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: {
    revenue: number; // percentage change
    satisfaction: number;
    marketShare: number;
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeline: string; // e.g., "1 week", "1 month"
    resources: string[];
  };
}

export interface DemandInsight extends DistrictInsight {
  type: 'demand_rising' | 'demand_falling';
  demand: {
    category: string;
    locality?: string;
    currentLevel: number;
    trend: 'rising' | 'falling' | 'stable';
    growthRate: number; // percentage
    peakHours: number[];
    unmetDemand: number;
  };
}

export interface TrustInsight extends DistrictInsight {
  type: 'trust_concentration' | 'vendor_reliability';
  trust: {
    averageScore: number;
    distribution: {
      high: number; // count of high-trust vendors
      medium: number;
      low: number;
    };
    concentration: number; // how concentrated trust is
    volatility: number; // how stable trust scores are
    topPerformers: Array<{
      vendorId: number;
      name: string;
      score: number;
    }>;
  };
}

export interface ExecutionInsight extends DistrictInsight {
  type: 'execution_success_cluster' | 'failure_repeated';
  execution: {
    successRate: number; // 0-1
    totalActions: number;
    successfulActions: number;
    failureRate: number; // 0-1
    commonFailures: string[];
    topPerformingVendors: Array<{
      vendorId: number;
      name: string;
      successRate: number;
    }>;
  };
}

export interface LocalityInsight {
  type: 'shortage_locality' | 'locality_trend';
  locality: {
    name: string;
    type: 'residential' | 'commercial' | 'mixed';
    activityLevel: number; // 0-1
    dominantCategories: string[];
    trustDensity: number; // 0-1
    demandIntensity: number; // 0-1
    executionSuccess: number; // 0-1
    shortages: string[]; // categories with shortages
    opportunities: string[]; // categories with potential
  };
}

export interface DistrictHealthSnapshot {
  districtId: number;
  timestamp: number;
  period: 'daily' | 'weekly' | 'monthly';

  // Overall health metrics
  health: {
    overall: number; // 0-1 composite health score
    searchSuccess: number; // percentage of successful searches
    executionSuccess: number; // percentage of successful executions
    userSatisfaction: number; // average satisfaction score
    trustDensity: number; // average trust across district
  };

  // Demand metrics
  demand: {
    totalSearches: number;
    successfulGrounding: number;
    categoryDistribution: Record<string, number>; // category -> search count
    temporalPatterns: Record<string, number>; // time period -> activity level
    unmetDemand: number; // percentage of unresolved searches
  };

  // Execution metrics
  execution: {
    totalActions: number;
    successfulActions: number;
    failureRate: number; // 0-1
    actionDistribution: Record<string, number>; // action_type -> count
    localityPerformance: Record<string, number>; // locality -> success rate
  };

  // Trust metrics
  trust: {
    averageScore: number; // 0-1
    vendorDistribution: {
      high: number; // count
      medium: number;
      low: number;
    };
    trustVolatility: number; // how much trust scores change
    topTrustedCategories: string[];
  };

  // Locality metrics
  locality: {
    activeLocalities: number;
    averageActivity: number; // 0-1
    trustDensity: number; // 0-1
    coverageGaps: string[]; // localities with poor coverage
    opportunityAreas: string[]; // localities with growth potential
  };

  // Alert summary
  alerts: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recentActivity: IntelligenceAlert[];
  };

  metadata: {
    dataCompleteness: number; // 0-1
    confidence: number; // 0-1
    lastUpdated: number;
  };
}

export interface IntelligenceAlert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  districtId: number;
  title: string;
  description: string;
  affectedEntities: Array<{
    type: 'vendor' | 'category' | 'locality';
    id: string | number;
    name: string;
  }>;
  metrics: Record<string, any>;
  trigger: {
    condition: string;
    threshold: number;
    currentValue: number;
  };
  recommendations: string[];
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  metadata: {
    source: string;
    confidence: number;
    autoGenerated: boolean;
  };
}

export type AlertType =
  | 'DEMAND_SPIKE'
  | 'TRUST_DROP'
  | 'SERVICE_GAP'
  | 'EXECUTION_FAILURE_CLUSTER'
  | 'HIGH_EMERGENCY_ACTIVITY'
  | 'LOCALITY_SHORTAGE'
  | 'VENDOR_RELIABILITY_DROP'
  | 'CATEGORY_GROWTH_SPIKE'
  | 'UNMET_DEMAND_CLUSTER'
  | 'TRUST_CONCENTRATION_RISK';

export interface IntelligenceAggregation {
  districtId: number;
  timeWindow: {
    start: number;
    end: number;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';

  // Aggregated signals
  signals: {
    cognition: number; // cognition signal count
    execution: number; // execution signal count
    trust: number; // trust signal count
    locality: number; // locality signal count
    demand: number; // demand signal count
    ranking: number; // ranking signal count
  };

  // Derived insights
  insights: {
    generated: number; // total insights generated
    byType: Record<InsightType, number>;
    byPriority: Record<string, number>; // low, medium, high, critical
  };

  // Health indicators
  health: {
    dataQuality: number; // 0-1
    signalCompleteness: number; // 0-1
    insightAccuracy: number; // 0-1
    processingEfficiency: number; // 0-1
  };

  metadata: {
    lastAggregation: number;
    processingTime: number; // in ms
    confidence: number; // 0-1
  };
}