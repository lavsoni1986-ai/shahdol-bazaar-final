/**
 * CANONICAL GRAPH NODE TYPES
 * BharatOS Phase 5 - District Memory Graph Foundation
 *
 * Core node types for district relationship intelligence
 */

export enum GraphNodeType {
  // Administrative
  DISTRICT = 'DISTRICT',
  LOCALITY = 'LOCALITY',

  // Business entities
  PARTNER = 'PARTNER',
  CATEGORY = 'CATEGORY',

  // Intelligence clusters
  DEMAND_CLUSTER = 'DEMAND_CLUSTER',
  TRUST_CLUSTER = 'TRUST_CLUSTER',
  SERVICE_GAP = 'SERVICE_GAP',

  // Mobility & infrastructure
  LANDMARK = 'LANDMARK',
  TRANSPORT_HUB = 'TRANSPORT_HUB',

  // Temporal patterns
  TIME_WINDOW = 'TIME_WINDOW',
  DEMAND_PATTERN = 'DEMAND_PATTERN',
}

export interface GraphNodeProperties {
  [GraphNodeType.DISTRICT]: {
    name: string;
    population: number;
    area: number;
    primaryLanguage: string;
    timezone: string;
  };

  [GraphNodeType.LOCALITY]: {
    name: string;
    type: 'residential' | 'commercial' | 'industrial' | 'mixed';
    population: number;
    coordinates?: { lat: number; lng: number };
    landmarks: string[];
  };

  [GraphNodeType.PARTNER]: {
    name: string;
    category: string;
    rating: number;
    reviewCount: number;
    dsslScore: number;
  };

  [GraphNodeType.CATEGORY]: {
    name: string;
    parentCategory?: string;
    demandFrequency: number;
    averagePrice: number;
  };

  [GraphNodeType.DEMAND_CLUSTER]: {
    category: string;
    intensity: number; // 0-1
    temporalPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'weekend';
    radius: number; // in meters
  };

  [GraphNodeType.TRUST_CLUSTER]: {
    averageDsslScore: number;
    vendorCount: number;
    userSatisfaction: number;
    fraudIncidents: number;
  };

  [GraphNodeType.SERVICE_GAP]: {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reportedIncidents: number;
    lastIncident: number;
  };

  [GraphNodeType.LANDMARK]: {
    name: string;
    type: 'hospital' | 'school' | 'market' | 'temple' | 'station' | 'office';
    significance: number; // 0-1
  };

  [GraphNodeType.TRANSPORT_HUB]: {
    name: string;
    type: 'bus_stand' | 'railway' | 'airport' | 'auto_stand';
    connectivity: number; // 0-1
  };

  [GraphNodeType.TIME_WINDOW]: {
    startHour: number;
    endHour: number;
    dayOfWeek: number; // 0-6
    demandMultiplier: number;
  };

  [GraphNodeType.DEMAND_PATTERN]: {
    category: string;
    pattern: 'rising' | 'falling' | 'stable' | 'seasonal';
    confidence: number; // 0-1
    trendStrength: number; // -1 to 1
  };
}

export type NodeProperties<T extends GraphNodeType> = GraphNodeProperties[T];