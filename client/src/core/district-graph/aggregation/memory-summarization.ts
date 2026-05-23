/**
 * DISTRICT MEMORY SUMMARIZATION FOUNDATION
 * BharatOS Phase 5 - District Memory Graph Foundation
 *
 * Framework for creating intelligent summaries of district patterns
 */

export interface MemorySummary {
  id: string;
  type: MemorySummaryType;
  title: string;
  summary: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: {
    start: number;
    end: number;
  };
  scope: {
    localities?: string[];
    categories?: string[];
    vendors?: number[];
  };
  insights: SummaryInsight[];
  recommendations: SummaryRecommendation[];
  metadata: {
    generated: number;
    dataPoints: number;
    algorithms: string[];
    source: string;
  };
}

export type MemorySummaryType =
  | 'demand_trend'
  | 'supply_gap'
  | 'trust_shift'
  | 'locality_pattern'
  | 'competition_change'
  | 'seasonal_pattern'
  | 'emergency_indicator'
  | 'opportunity_alert';

export interface SummaryInsight {
  type: 'rising_demand' | 'falling_demand' | 'supply_shortage' | 'trust_improvement' | 'competition_increase';
  description: string;
  metrics: {
    change: number; // percentage or absolute
    timeframe: string;
    significance: number; // 0-1
  };
  evidence: {
    signalCount: number;
    keyIndicators: string[];
    supportingData: Record<string, any>;
  };
}

export interface SummaryRecommendation {
  type: 'expand_service' | 'reduce_capacity' | 'increase_pricing' | 'improve_quality' | 'target_locality';
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: {
    revenue: number; // percentage change
    satisfaction: number;
    marketShare: number;
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeline: string; // e.g., "2 weeks", "1 month"
    resources: string[];
  };
}

export interface DemandTrendSummary extends MemorySummary {
  type: 'demand_trend';
  trend: {
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number; // percentage change
    acceleration: number; // rate of change in trend
    seasonality: boolean;
  };
  factors: {
    category: string;
    locality: string;
    timePattern: string;
    externalInfluences: string[];
  };
}

export interface SupplyGapSummary extends MemorySummary {
  type: 'supply_gap';
  gap: {
    category: string;
    locality: string;
    severity: number; // 0-1
    affectedUsers: number;
    unmetDemand: number; // estimated
  };
  causes: {
    vendorShortage: boolean;
    capacityIssues: boolean;
    qualityProblems: boolean;
    pricingIssues: boolean;
  };
}

export interface TrustShiftSummary extends MemorySummary {
  type: 'trust_shift';
  shift: {
    direction: 'improving' | 'declining' | 'stable';
    magnitude: number; // change in trust score
    affectedVendors: number[];
    locality: string;
  };
  triggers: {
    incidentCount: number;
    reviewVolume: number;
    executionFailures: number;
    userComplaints: number;
  };
}

export interface LocalityPatternSummary extends MemorySummary {
  type: 'locality_pattern';
  pattern: {
    locality: string;
    dominantCategories: string[];
    peakTimes: string[];
    userDemographics: string;
    uniqueCharacteristics: string[];
  };
  opportunities: {
    underservedCategories: string[];
    growthPotential: number;
    competitionLevel: 'low' | 'medium' | 'high';
  };
}

export interface CompetitionChangeSummary extends MemorySummary {
  type: 'competition_change';
  change: {
    category: string;
    locality: string;
    newEntrants: number;
    exits: number;
    marketConcentration: number; // 0-1
  };
  impacts: {
    pricingPressure: number;
    serviceQuality: number;
    customerChoice: number;
  };
}

export interface SeasonalPatternSummary extends MemorySummary {
  type: 'seasonal_pattern';
  pattern: {
    category: string;
    cycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
    peakPeriod: string;
    troughPeriod: string;
    predictability: number; // 0-1
  };
  businessImplications: {
    inventoryPlanning: string;
    staffingNeeds: string;
    pricingStrategy: string;
  };
}

export interface EmergencyIndicatorSummary extends MemorySummary {
  type: 'emergency_indicator';
  indicator: {
    type: 'health' | 'safety' | 'infrastructure' | 'service';
    locality: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedUsers: number;
  };
  response: {
    immediateActions: string[];
    coordinationNeeded: string[];
    resourceRequirements: string[];
  };
}

export interface OpportunityAlertSummary extends MemorySummary {
  type: 'opportunity_alert';
  opportunity: {
    type: 'market_gap' | 'demand_spike' | 'service_shortage' | 'trend_emergence';
    category: string;
    locality: string;
    potential: number; // estimated opportunity size
    timeSensitivity: 'low' | 'medium' | 'high' | 'immediate';
  };
  actionPlan: {
    recommendedService: string;
    targetMarket: string;
    competitiveAdvantage: string;
    entryStrategy: string;
  };
}

// Summarization engine interface
export interface MemorySummarizationEngine {
  // Core summarization methods
  generateDemandTrendSummary(window: any): Promise<DemandTrendSummary[]>;
  generateSupplyGapSummary(window: any): Promise<SupplyGapSummary[]>;
  generateTrustShiftSummary(window: any): Promise<TrustShiftSummary[]>;
  generateLocalityPatternSummary(window: any): Promise<LocalityPatternSummary[]>;

  // Advanced summarization
  detectEmergingPatterns(window: any): Promise<MemorySummary[]>;
  prioritizeInsights(summaries: MemorySummary[]): MemorySummary[];
  generateActionableRecommendations(summary: MemorySummary): SummaryRecommendation[];

  // Real-time updates
  updateFromNewSignals(signals: any[]): Promise<MemorySummary[]>;
  invalidateOutdatedSummaries(threshold: number): Promise<void>;
}