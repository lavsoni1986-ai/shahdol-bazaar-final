/**
 * INSIGHT GENERATION FOUNDATION
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Backend foundation for generating district intelligence insights
 */

import { DistrictInsight, DemandInsight, TrustInsight, ExecutionInsight, LocalityInsight } from '../types';

export interface InsightGenerator {
  // Core insight generation
  generateInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<DistrictInsight[]>;

  // Specific insight types
  generateDemandInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<DemandInsight[]>;
  generateTrustInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<TrustInsight[]>;
  generateExecutionInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<ExecutionInsight[]>;
  generateLocalityInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<LocalityInsight[]>;

  // Insight validation and prioritization
  validateInsight(insight: DistrictInsight): Promise<boolean>;
  prioritizeInsight(insight: DistrictInsight): Promise<number>; // returns priority score 1-10
}

export interface DemandInsightGenerator {
  // Rising demand detection
  detectRisingDemand(districtId: number, category: string, timeWindow: { start: number; end: number }): Promise<{
    isRising: boolean;
    growthRate: number;
    confidence: number;
    peakHours: number[];
    localities: string[];
  }>;

  // Unmet demand analysis
  analyzeUnmetDemand(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    totalUnmet: number;
    categories: Array<{
      name: string;
      count: number;
      localities: string[];
    }>;
    patterns: string[];
  }>;

  // Demand concentration
  detectDemandConcentration(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    hotspots: Array<{
      locality: string;
      category: string;
      intensity: number;
    }>;
    underserved: Array<{
      locality: string;
      missingCategories: string[];
    }>;
  }>;
}

export interface TrustInsightGenerator {
  // Trust concentration analysis
  analyzeTrustConcentration(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    concentrationIndex: number; // 0-1, how concentrated trust is
    topPerformers: Array<{
      vendorId: number;
      category: string;
      trustScore: number;
    }>;
    trustGaps: Array<{
      category: string;
      locality: string;
      averageTrust: number;
    }>;
  }>;

  // Trust volatility detection
  detectTrustVolatility(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    volatilityIndex: number; // 0-1
    unstableVendors: Array<{
      vendorId: number;
      trustChange: number; // negative = trust drop
      reasons: string[];
    }>;
    stablePerformers: Array<{
      vendorId: number;
      consistencyScore: number;
    }>;
  }>;

  // Vendor reliability insights
  generateVendorReliabilityInsights(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    highlyReliable: Array<{
      vendorId: number;
      reliabilityScore: number;
      strengths: string[];
    }>;
    concerningVendors: Array<{
      vendorId: number;
      issues: string[];
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  }>;
}

export interface ExecutionInsightGenerator {
  // Execution success clusters
  detectSuccessClusters(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    clusters: Array<{
      locality: string;
      category: string;
      successRate: number;
      volume: number;
    }>;
    patterns: string[];
  }>;

  // Repeated failure analysis
  analyzeRepeatedFailures(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    failureClusters: Array<{
      type: string;
      count: number;
      affectedUsers: number;
      localities: string[];
    }>;
    systemicIssues: Array<{
      issue: string;
      severity: number;
      affectedCategories: string[];
    }>;
  }>;

  // Action pattern insights
  analyzeActionPatterns(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    frequentActions: Array<{
      actionType: string;
      frequency: number;
      successRate: number;
      peakTimes: string[];
    }>;
    unusualPatterns: Array<{
      pattern: string;
      significance: number;
      explanation: string;
    }>;
  }>;
}

export interface LocalityInsightGenerator {
  // Locality shortage detection
  detectLocalityShortages(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    shortages: Array<{
      locality: string;
      category: string;
      severity: number;
      unmetDemand: number;
    }>;
    recommendations: Array<{
      locality: string;
      action: string;
      expectedImpact: number;
    }>;
  }>;

  // Locality trend analysis
  analyzeLocalityTrends(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    trendingUp: Array<{
      locality: string;
      growthRate: number;
      drivers: string[];
    }>;
    declining: Array<{
      locality: string;
      declineRate: number;
      reasons: string[];
    }>;
    emerging: Array<{
      locality: string;
      potential: number;
      opportunities: string[];
    }>;
  }>;

  // Locality performance comparison
  compareLocalityPerformance(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    topPerformers: Array<{
      locality: string;
      performanceScore: number;
      strengths: string[];
    }>;
    needsAttention: Array<{
      locality: string;
      issues: string[];
      priority: 'low' | 'medium' | 'high';
    }>;
  }>;
}

// Insight generation configuration
export interface InsightGenerationConfig {
  enabled: boolean;
  generation: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    batchSize: number;
    maxInsightsPerRun: number;
    minimumConfidence: number; // 0-1
  };

  prioritization: {
    weights: {
      impact: number;
      confidence: number;
      recency: number;
      dataQuality: number;
    };
    minimumPriority: number; // 1-10
  };

  validation: {
    enabled: boolean;
    minimumDataPoints: number;
    statisticalSignificance: number; // p-value threshold
    crossValidation: boolean;
  };

  caching: {
    enabled: boolean;
    ttl: number; // in seconds
    maxCacheSize: number;
  };
}

// Insight templates for consistent generation
export interface InsightTemplate {
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    weight: number;
  }>;
  recommendations: string[];
}