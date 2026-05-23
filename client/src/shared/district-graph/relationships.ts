/**
 * CANONICAL RELATIONSHIP TYPES
 * BharatOS Phase 5 - District Memory Graph Foundation
 *
 * Core relationship types for district relationship intelligence
 */

export enum GraphRelationshipType {
  // Location relationships
  SEARCHED_IN = 'SEARCHED_IN',
  LOCATED_IN = 'LOCATED_IN',
  NEAR_LANDMARK = 'NEAR_LANDMARK',
  SERVES_LOCALITY = 'SERVES_LOCALITY',

  // Demand relationships
  HIGH_DEMAND = 'HIGH_DEMAND',
  LOW_DEMAND = 'LOW_DEMAND',
  DEMAND_SPIKE = 'DEMAND_SPIKE',
  DEMAND_PATTERN = 'DEMAND_PATTERN',

  // Trust relationships
  HIGH_TRUST = 'HIGH_TRUST',
  LOW_TRUST = 'LOW_TRUST',
  TRUST_CLUSTER_MEMBER = 'TRUST_CLUSTER_MEMBER',

  // Service relationships
  SUPPLY_GAP = 'SUPPLY_GAP',
  SERVICE_OVERLAP = 'SERVICE_OVERLAP',
  FREQUENT_ACTION = 'FREQUENT_ACTION',

  // Mobility relationships
  CONNECTED_TO = 'CONNECTED_TO',
  FREQUENT_ROUTE = 'FREQUENT_ROUTE',
  TRAFFIC_HOTSPOT = 'TRAFFIC_HOTSPOT',

  // Temporal relationships
  ACTIVE_DURING = 'ACTIVE_DURING',
  PEAK_TIME = 'PEAK_TIME',
  OFF_PEAK_TIME = 'OFF_PEAK_TIME',

  // Intelligence relationships
  INFLUENCES = 'INFLUENCES',
  CORRELATES_WITH = 'CORRELATES_WITH',
  CAUSES = 'CAUSES',
  MITIGATES = 'MITIGATES',
}

export interface GraphRelationshipProperties {
  [GraphRelationshipType.SEARCHED_IN]: {
    queryCount: number;
    lastSearch: number;
    averageIntent: string;
  };

  [GraphRelationshipType.LOCATED_IN]: {
    distance: number; // in meters
    travelTime: number; // in minutes
    accessibility: number; // 0-1
  };

  [GraphRelationshipType.NEAR_LANDMARK]: {
    landmarkType: string;
    significance: number; // 0-1
    footTraffic: number;
  };

  [GraphRelationshipType.SERVES_LOCALITY]: {
    coverage: number; // 0-1 percentage of locality served
    primaryService: boolean;
    competitionLevel: number; // 0-1
  };

  [GraphRelationshipType.HIGH_DEMAND]: {
    demandScore: number; // 0-1
    timeWindow: string;
    growthRate: number; // percentage
  };

  [GraphRelationshipType.LOW_DEMAND]: {
    demandScore: number; // 0-1
    reason: 'satisfied' | 'unavailable' | 'unaffordable' | 'unknown';
    lastDemand: number;
  };

  [GraphRelationshipType.DEMAND_SPIKE]: {
    spikeMagnitude: number; // multiplier
    duration: number; // in hours
    trigger: string;
    confidence: number; // 0-1
  };

  [GraphRelationshipType.DEMAND_PATTERN]: {
    patternType: 'seasonal' | 'event_based' | 'trend' | 'cyclical';
    strength: number; // 0-1
    predictability: number; // 0-1
  };

  [GraphRelationshipType.HIGH_TRUST]: {
    trustScore: number; // 0-1
    evidenceCount: number;
    lastVerified: number;
  };

  [GraphRelationshipType.LOW_TRUST]: {
    trustScore: number; // 0-1
    incidentCount: number;
    lastIncident: number;
  };

  [GraphRelationshipType.TRUST_CLUSTER_MEMBER]: {
    membershipStrength: number; // 0-1
    contributionScore: number; // how much this member affects cluster
  };

  [GraphRelationshipType.SUPPLY_GAP]: {
    gapSeverity: number; // 0-1
    affectedUsers: number;
    economicImpact: number;
  };

  [GraphRelationshipType.SERVICE_OVERLAP]: {
    overlapPercentage: number; // 0-1
    competitionType: 'direct' | 'indirect' | 'complementary';
    marketShare: number; // 0-1
  };

  [GraphRelationshipType.FREQUENT_ACTION]: {
    actionType: string;
    frequency: number; // actions per day
    successRate: number; // 0-1
    userDiversity: number; // unique users
  };

  [GraphRelationshipType.CONNECTED_TO]: {
    connectionType: 'road' | 'walking' | 'public_transport';
    distance: number; // in meters
    travelTime: number; // in minutes
  };

  [GraphRelationshipType.FREQUENT_ROUTE]: {
    tripCount: number;
    averageDuration: number; // in minutes
    peakHours: number[]; // hour of day
  };

  [GraphRelationshipType.TRAFFIC_HOTSPOT]: {
    congestionLevel: number; // 0-1
    duration: number; // in hours
    affectedRoutes: string[];
  };

  [GraphRelationshipType.ACTIVE_DURING]: {
    activityScore: number; // 0-1
    peakHours: number[];
    consistency: number; // 0-1
  };

  [GraphRelationshipType.PEAK_TIME]: {
    peakMultiplier: number; // demand multiplier
    duration: number; // in hours
    reliability: number; // 0-1
  };

  [GraphRelationshipType.OFF_PEAK_TIME]: {
    demandMultiplier: number; // < 1.0
    opportunities: string[]; // business opportunities
  };

  [GraphRelationshipType.INFLUENCES]: {
    influenceStrength: number; // 0-1
    direction: 'positive' | 'negative' | 'neutral';
    mechanism: string;
  };

  [GraphRelationshipType.CORRELATES_WITH]: {
    correlationCoefficient: number; // -1 to 1
    confidence: number; // 0-1
    timeLag: number; // in hours, if applicable
  };

  [GraphRelationshipType.CAUSES]: {
    causalityStrength: number; // 0-1
    evidenceType: 'statistical' | 'observational' | 'experimental';
    mechanism: string;
  };

  [GraphRelationshipType.MITIGATES]: {
    mitigationEffectiveness: number; // 0-1
    cost: number;
    sideEffects: string[];
  };
}

export type RelationshipProperties<T extends GraphRelationshipType> = GraphRelationshipProperties[T];