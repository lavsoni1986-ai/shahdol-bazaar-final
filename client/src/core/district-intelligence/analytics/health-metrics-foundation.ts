/**
 * DISTRICT HEALTH METRICS FOUNDATION
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Foundation for tracking district health and operational metrics
 */

import { DistrictHealthSnapshot } from '../../shared/district-intelligence/types';

export interface DistrictHealthMonitor {
  // Health snapshot generation
  generateHealthSnapshot(districtId: number, period: 'daily' | 'weekly' | 'monthly'): Promise<DistrictHealthSnapshot>;

  // Individual metric calculation
  calculateSearchSuccessRate(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;
  calculateExecutionSuccessRate(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;
  calculateUnresolvedDemandRatio(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;
  calculateLocalityTrustDensity(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;
  calculateVendorResponsiveness(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;
  calculateCategoryCoverage(districtId: number, timeWindow: { start: number; end: number }): Promise<number>;

  // Health trend analysis
  analyzeHealthTrends(districtId: number, periods: number): Promise<HealthTrendAnalysis>;

  // Health alerts
  detectHealthIssues(districtId: number, snapshot: DistrictHealthSnapshot): Promise<HealthIssue[]>;
}

export interface HealthMetrics {
  // Core health indicators
  searchSuccessRate: number; // percentage of searches that find results
  executionSuccessRate: number; // percentage of actions that complete successfully
  unresolvedDemandRatio: number; // percentage of searches that remain unmet
  localityTrustDensity: number; // average trust score across localities
  vendorResponsiveness: number; // average response time in minutes
  categoryCoverage: number; // percentage of categories with active vendors

  // Derived health scores
  overallHealth: number; // composite health score 0-1
  userSatisfaction: number; // estimated user satisfaction 0-1
  systemEfficiency: number; // operational efficiency 0-1
  trustEcosystem: number; // trust infrastructure health 0-1

  // Component breakdowns
  searchHealth: {
    totalSearches: number;
    successfulSearches: number;
    failedSearches: number;
    averageResults: number;
    searchLatency: number; // in ms
  };

  executionHealth: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    averageCompletionTime: number; // in minutes
    actionDistribution: Record<string, number>;
  };

  demandHealth: {
    totalDemand: number;
    satisfiedDemand: number;
    unmetDemand: number;
    demandFulfillment: number; // 0-1
    demandPatterns: Record<string, number>; // category -> demand volume
  };

  trustHealth: {
    averageTrust: number;
    trustDistribution: {
      high: number; // count
      medium: number;
      low: number;
    };
    trustVolatility: number; // how much trust changes
    trustReliability: number; // consistency of trust signals
  };

  localityHealth: {
    activeLocalities: number;
    averageLocalityActivity: number; // 0-1
    localityCoverage: number; // percentage of district covered
    localityBalance: number; // how evenly distributed activity is
  };

  categoryHealth: {
    activeCategories: number;
    categoryBalance: number; // how evenly distributed across categories
    categoryGrowth: Record<string, number>; // category -> growth rate
    categoryHealth: Record<string, number>; // category -> health score
  };
}

export interface HealthTrendAnalysis {
  districtId: number;
  periods: number; // number of periods analyzed
  periodType: 'daily' | 'weekly' | 'monthly';

  trends: {
    overallHealth: TrendAnalysis;
    searchSuccessRate: TrendAnalysis;
    executionSuccessRate: TrendAnalysis;
    userSatisfaction: TrendAnalysis;
    trustDensity: TrendAnalysis;
  };

  componentTrends: {
    search: HealthComponentTrend;
    execution: HealthComponentTrend;
    demand: HealthComponentTrend;
    trust: HealthComponentTrend;
    locality: HealthComponentTrend;
  };

  insights: {
    improving: string[]; // areas showing improvement
    declining: string[]; // areas showing decline
    stable: string[]; // areas remaining stable
    concerning: string[]; // areas needing attention
  };
}

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  magnitude: number; // rate of change
  confidence: number; // 0-1
  dataPoints: number;
  volatility: number; // how variable the trend is
  projection: {
    nextPeriod: number;
    confidence: number;
  };
}

export interface HealthComponentTrend {
  component: string;
  currentValue: number;
  trend: TrendAnalysis;
  contributingFactors: Array<{
    factor: string;
    impact: number; // positive or negative contribution
    significance: number; // 0-1
  }>;
  recommendations: Array<{
    action: string;
    expectedImpact: number;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export interface HealthIssue {
  id: string;
  type: HealthIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedComponent: string;
  currentValue: number;
  threshold: number;
  impact: {
    users: number; // estimated affected users
    revenue: number; // estimated revenue impact
    satisfaction: number; // satisfaction impact
  };
  rootCause: string;
  recommendations: Array<{
    action: string;
    expectedImprovement: number;
    timeline: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  metadata: {
    detected: number;
    confidence: number;
    dataQuality: number;
  };
}

export type HealthIssueType =
  | 'search_failure_rate_high'
  | 'execution_failure_rate_high'
  | 'unmet_demand_high'
  | 'trust_density_low'
  | 'vendor_responsiveness_poor'
  | 'category_coverage_low'
  | 'locality_coverage_uneven'
  | 'system_efficiency_declining'
  | 'user_satisfaction_declining'
  | 'trust_ecosystem_weak';

export interface HealthBaseline {
  districtId: number;
  metric: string;
  baselinePeriod: {
    start: number;
    end: number;
  };

  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentiles: {
      p25: number;
      p75: number;
      p90: number;
      p95: number;
    };
  };

  thresholds: {
    warning: number; // when to show warning
    critical: number; // when to alert
    excellent: number; // excellent performance threshold
  };

  seasonalAdjustments?: Record<string, number>; // seasonal baseline adjustments
  trendAdjustment?: number; // long-term trend adjustment
}

export interface HealthMonitoringConfig {
  enabled: boolean;
  monitoring: {
    frequency: 'realtime' | 'hourly' | 'daily';
    retentionPeriod: number; // days to keep health data
    alertThresholds: {
      warning: number; // deviation threshold for warnings
      critical: number; // deviation threshold for alerts
    };
  };

  baselines: {
    autoUpdate: boolean;
    updateFrequency: 'weekly' | 'monthly';
    minimumDataPoints: number;
    stabilityPeriod: number; // days of stable data needed
  };

  alerts: {
    enabled: boolean;
    channels: ('email' | 'dashboard' | 'api')[];
    escalation: {
      warningTimeout: number; // minutes
      criticalTimeout: number; // minutes
    };
  };

  reporting: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    recipients: string[];
    format: 'summary' | 'detailed' | 'raw';
  };
}

// Health score calculation weights
export interface HealthScoreWeights {
  search: number; // 0-1
  execution: number; // 0-1
  demand: number; // 0-1
  trust: number; // 0-1
  locality: number; // 0-1
  category: number; // 0-1

  // Sub-weights for components
  searchWeights: {
    successRate: number;
    resultQuality: number;
    latency: number;
  };

  executionWeights: {
    successRate: number;
    completionTime: number;
    userSatisfaction: number;
  };

  demandWeights: {
    fulfillment: number;
    resolution: number;
    satisfaction: number;
  };

  trustWeights: {
    averageScore: number;
    distribution: number;
    reliability: number;
  };

  localityWeights: {
    coverage: number;
    activity: number;
    balance: number;
  };

  categoryWeights: {
    coverage: number;
    balance: number;
    health: number;
  };
}