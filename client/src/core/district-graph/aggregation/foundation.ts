/**
 * DISTRICT AGGREGATION FOUNDATION
 * BharatOS Phase 5 - District Memory Graph Foundation
 *
 * Backend intelligence aggregation by locality, category, time, execution patterns
 */

export interface AggregationWindow {
  start: number; // timestamp
  end: number;   // timestamp
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface LocalityAggregation {
  locality: string;
  window: AggregationWindow;

  // Demand metrics
  demand: {
    totalQueries: number;
    uniqueCategories: number;
    peakCategory: string;
    averageIntent: string;
    failedGroundingCount: number;
  };

  // Execution metrics
  execution: {
    totalActions: number;
    successfulActions: number;
    actionBreakdown: Record<string, number>; // action_type -> count
    conversionRate: number; // successful/total
    averageResponseTime: number; // in ms
  };

  // Trust metrics
  trust: {
    averageDsslScore: number;
    trustDistribution: {
      high: number; // count of high-trust vendors
      medium: number;
      low: number;
    };
    complaintRate: number;
    reviewVolume: number;
  };

  // Temporal patterns
  temporal: {
    peakHours: number[];
    peakDays: number[];
    seasonality: 'daily' | 'weekly' | 'monthly';
    demandVolatility: number; // 0-1, how variable demand is
  };

  // Mobility patterns
  mobility: {
    transportHubProximity: number; // 0-1, how close to transport
    footTrafficEstimate: number;
    accessibilityScore: number; // 0-1
  };
}

export interface CategoryAggregation {
  category: string;
  window: AggregationWindow;

  // Supply metrics
  supply: {
    activeVendors: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    serviceRadius: number; // average service area in meters
  };

  // Demand metrics
  demand: {
    queryVolume: number;
    executionVolume: number;
    satisfactionRate: number;
    demandGrowth: number; // percentage change
  };

  // Competition metrics
  competition: {
    marketConcentration: number; // 0-1, how concentrated the market is
    averageDistance: number; // between competing vendors
    overlapScore: number; // service area overlap
  };

  // Performance metrics
  performance: {
    averageResponseTime: number;
    successRate: number;
    complaintRate: number;
    reliabilityScore: number; // 0-1
  };
}

export interface TimeWindowAggregation {
  timeWindow: {
    startHour: number;
    endHour: number;
    dayOfWeek?: number;
  };
  window: AggregationWindow;

  // Activity metrics
  activity: {
    queryCount: number;
    executionCount: number;
    uniqueUsers: number;
    averageSessionDuration: number;
  };

  // Category preferences
  preferences: Record<string, {
    queryShare: number; // percentage of queries
    executionShare: number;
    satisfaction: number;
  }>;

  // Locality hotspots
  hotspots: Array<{
    locality: string;
    activityScore: number; // 0-1
    dominantCategory: string;
  }>;
}

export interface AggregationEngine {
  // Core aggregation methods
  aggregateByLocality(locality: string, window: AggregationWindow): Promise<LocalityAggregation>;
  aggregateByCategory(category: string, window: AggregationWindow): Promise<CategoryAggregation>;
  aggregateByTimeWindow(timeSpec: any, window: AggregationWindow): Promise<TimeWindowAggregation>;

  // Advanced aggregations
  detectDemandClusters(window: AggregationWindow): Promise<DemandCluster[]>;
  calculateTrustDensity(window: AggregationWindow): Promise<TrustDensityMap>;
  identifyServiceGaps(window: AggregationWindow): Promise<ServiceGap[]>;

  // Real-time updates
  updateFromSignal(signal: any): Promise<void>;
  recalculateAggregations(window: AggregationWindow): Promise<void>;
}

export interface DemandCluster {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  category: string;
  intensity: number; // 0-1
  temporalPattern: string;
  supportingQueries: number;
  conversionRate: number;
}

export interface TrustDensityMap {
  localities: Record<string, {
    averageTrust: number;
    vendorCount: number;
    userSatisfaction: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export interface ServiceGap {
  category: string;
  locality: string;
  severity: number; // 0-1
  affectedUsers: number;
  potentialRevenue: number;
  recommendedActions: string[];
}

// Aggregation pipeline configuration
export interface AggregationConfig {
  enabledAggregations: ('locality' | 'category' | 'temporal')[];
  windowSizes: ('hour' | 'day' | 'week' | 'month')[];
  updateFrequency: number; // in minutes
  retentionPeriod: number; // in days
  minimumDataThreshold: number; // minimum signals for aggregation
}