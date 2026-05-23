/**
 * ADMIN INTELLIGENCE API FOUNDATION
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Foundation for admin APIs to access district intelligence
 */

// Note: This is server-side code, but placed in client/src for organization
// In actual implementation, this would be in server/routes/admin/

export interface IntelligenceApiEndpoints {
  // Core intelligence APIs
  '/api/admin/intelligence/summary': IntelligenceSummaryRequest;
  '/api/admin/intelligence/demand': DemandIntelligenceRequest;
  '/api/admin/intelligence/trust': TrustIntelligenceRequest;
  '/api/admin/intelligence/localities': LocalityIntelligenceRequest;
  '/api/admin/intelligence/alerts': AlertIntelligenceRequest;
  '/api/admin/intelligence/health': HealthIntelligenceRequest;

  // Advanced analytics
  '/api/admin/intelligence/trends': TrendAnalysisRequest;
  '/api/admin/intelligence/correlations': CorrelationAnalysisRequest;
  '/api/admin/intelligence/predictions': PredictionRequest;
}

export interface IntelligenceSummaryRequest {
  method: 'GET';
  query: {
    districtId: number;
    period?: 'daily' | 'weekly' | 'monthly';
    includeTrends?: boolean;
    includeAlerts?: boolean;
  };
  response: {
    summary: DistrictIntelligenceSummary;
    health: DistrictHealthSnapshot;
    alerts: IntelligenceAlert[];
    trends: IntelligenceTrend[];
  };
}

export interface DemandIntelligenceRequest {
  method: 'GET';
  query: {
    districtId: number;
    category?: string;
    locality?: string;
    timeWindow?: {
      start: number;
      end: number;
    };
    granularity?: 'hour' | 'day' | 'week';
  };
  response: {
    demand: DemandAnalysis;
    insights: DemandInsight[];
    predictions: DemandPrediction[];
  };
}

export interface TrustIntelligenceRequest {
  method: 'GET';
  query: {
    districtId: number;
    entityType?: 'vendor' | 'category' | 'locality';
    entityId?: number;
    timeWindow?: {
      start: number;
      end: number;
    };
    minTrust?: number;
  };
  response: {
    trust: TrustAnalysis;
    insights: TrustInsight[];
    recommendations: TrustRecommendation[];
  };
}

export interface LocalityIntelligenceRequest {
  method: 'GET';
  query: {
    districtId: number;
    locality?: string;
    includeInactive?: boolean;
    timeWindow?: {
      start: number;
      end: number;
    };
  };
  response: {
    localities: LocalityAnalysis[];
    insights: LocalityInsight[];
    opportunities: LocalityOpportunity[];
  };
}

export interface AlertIntelligenceRequest {
  method: 'GET';
  query: {
    districtId: number;
    status?: 'active' | 'acknowledged' | 'resolved';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: AlertType;
    limit?: number;
    offset?: number;
  };
  response: {
    alerts: IntelligenceAlert[];
    summary: AlertSummary;
    trends: AlertTrend[];
  };
}

export interface HealthIntelligenceRequest {
  method: 'GET';
  query: {
    districtId: number;
    period?: 'daily' | 'weekly' | 'monthly';
    component?: 'search' | 'execution' | 'demand' | 'trust' | 'locality';
    includeTrends?: boolean;
  };
  response: {
    health: DistrictHealthSnapshot;
    trends: HealthTrendAnalysis;
    issues: HealthIssue[];
    recommendations: HealthRecommendation[];
  };
}

export interface TrendAnalysisRequest {
  method: 'GET';
  query: {
    districtId: number;
    metric: string;
    timeWindow: {
      start: number;
      end: number;
    };
    granularity?: 'hour' | 'day' | 'week' | 'month';
    includePredictions?: boolean;
  };
  response: {
    trend: TrendAnalysis;
    data: Array<{
      timestamp: number;
      value: number;
      confidence: number;
    }>;
    predictions: Array<{
      timestamp: number;
      value: number;
      confidence: number;
    }>;
  };
}

export interface CorrelationAnalysisRequest {
  method: 'GET';
  query: {
    districtId: number;
    signals: string[];
    timeWindow: {
      start: number;
      end: number;
    };
    correlationType?: 'pearson' | 'spearman' | 'kendall';
  };
  response: {
    correlations: SignalCorrelations;
    network: CorrelationNetwork;
    insights: CorrelationInsight[];
  };
}

export interface PredictionRequest {
  method: 'GET';
  query: {
    districtId: number;
    predictionType: 'demand' | 'trust' | 'health' | 'alerts';
    timeHorizon: number; // hours into future
    confidence?: number; // 0-1
    factors?: string[]; // specific factors to consider
  };
  response: {
    predictions: Array<{
      type: string;
      value: number;
      confidence: number;
      factors: Record<string, number>;
      timeHorizon: number;
    }>;
    scenarios: PredictionScenario[];
  };
}

// Response types (simplified for foundation)
export interface DistrictIntelligenceSummary {
  districtId: number;
  period: string;
  overview: {
    totalInsights: number;
    activeAlerts: number;
    healthScore: number;
    trendDirection: 'improving' | 'stable' | 'declining';
  };
  keyMetrics: Record<string, number>;
  topInsights: DistrictInsight[];
  recentActivity: IntelligenceActivity[];
}

export interface DemandAnalysis {
  totalDemand: number;
  categories: Record<string, DemandMetrics>;
  localities: Record<string, DemandMetrics>;
  trends: DemandTrend[];
  opportunities: DemandOpportunity[];
}

export interface DemandMetrics {
  volume: number;
  growth: number;
  satisfaction: number;
  unmet: number;
}

export interface TrustAnalysis {
  averageTrust: number;
  distribution: Record<string, number>;
  topPerformers: TrustPerformer[];
  concerns: TrustConcern[];
}

export interface LocalityAnalysis {
  name: string;
  activity: number;
  trust: number;
  demand: number;
  issues: string[];
  opportunities: string[];
}

export interface AlertSummary {
  total: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<string, number>;
  resolutionRate: number;
  averageResponseTime: number;
}

// Import types for reference
import {
  DistrictInsight,
  IntelligenceAlert,
  AlertType,
  DemandInsight,
  TrustInsight,
  LocalityInsight,
  DistrictHealthSnapshot,
  HealthTrendAnalysis,
  HealthIssue,
  TrendAnalysis,
  SignalCorrelations,
} from '../../shared/district-intelligence/types';

// Additional foundation types
export interface IntelligenceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  confidence: number;
}

export interface IntelligenceActivity {
  type: string;
  description: string;
  timestamp: number;
  impact: 'low' | 'medium' | 'high';
}

export interface DemandTrend {
  category: string;
  direction: 'rising' | 'falling';
  rate: number;
  duration: number;
}

export interface DemandPrediction {
  category: string;
  predictedDemand: number;
  confidence: number;
  timeframe: string;
}

export interface DemandOpportunity {
  category: string;
  locality: string;
  potential: number;
  action: string;
}

export interface TrustPerformer {
  entityId: number;
  entityType: string;
  trustScore: number;
  improvement: number;
}

export interface TrustConcern {
  entityId: number;
  entityType: string;
  issue: string;
  severity: number;
}

export interface TrustRecommendation {
  entityId: number;
  recommendation: string;
  expectedImpact: number;
}

export interface LocalityOpportunity {
  locality: string;
  opportunity: string;
  potential: number;
}

export interface HealthRecommendation {
  component: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CorrelationNetwork {
  nodes: Array<{
    id: string;
    type: string;
    importance: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
}

export interface CorrelationInsight {
  type: string;
  description: string;
  strength: number;
  significance: number;
}

export interface PredictionScenario {
  name: string;
  probability: number;
  outcome: Record<string, number>;
  drivers: string[];
}

// API configuration
export interface IntelligenceApiConfig {
  enabled: boolean;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  caching: {
    enabled: boolean;
    ttl: number; // in seconds
    maxSize: number;
  };
  authentication: {
    required: boolean;
    roles: string[];
  };
  monitoring: {
    enabled: boolean;
    metrics: boolean;
    logging: boolean;
  };
}