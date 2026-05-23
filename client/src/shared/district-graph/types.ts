/**
 * DISTRICT GRAPH TYPES
 * BharatOS Phase 5 - District Memory Graph Foundation
 *
 * Core types for district relationship intelligence graph
 */

import { GraphNodeType, NodeProperties } from './nodes';
import { GraphRelationshipType, RelationshipProperties } from './relationships';

export interface GraphNode<T extends GraphNodeType = GraphNodeType> {
  id: string;
  type: T;
  properties: NodeProperties<T>;
  metadata: {
    created: number;
    updated: number;
    source: string;
    confidence: number; // 0-1
    version: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface GraphRelationship<T extends GraphRelationshipType = GraphRelationshipType> {
  id: string;
  type: T;
  sourceId: string;
  targetId: string;
  properties: RelationshipProperties<T>;
  metadata: {
    created: number;
    updated: number;
    source: string;
    confidence: number; // 0-1
    strength: number; // 0-1, relationship strength
    direction: 'directed' | 'undirected';
  };
}

export interface DemandCluster {
  id: string;
  category: string;
  locality: string;
  center: { lat: number; lng: number };
  radius: number; // in meters
  intensity: number; // 0-1
  temporalPattern: {
    peakHours: number[];
    dayOfWeek: number[];
    seasonality: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  };
  metrics: {
    queryCount: number;
    executionCount: number;
    satisfactionRate: number;
    growthRate: number; // percentage change over time
  };
  relatedNodes: string[]; // node IDs
}

export interface LocalitySignal {
  locality: string;
  signalType: 'demand' | 'supply' | 'trust' | 'mobility';
  intensity: number; // 0-1
  timestamp: number;
  source: 'query' | 'execution' | 'feedback' | 'external';
  metadata: Record<string, any>;
}

export interface TrustSignal {
  locality: string;
  vendorId: number;
  signalType: 'rating' | 'review' | 'execution_success' | 'execution_failure' | 'complaint';
  value: number; // rating 1-5, or success 0/1
  timestamp: number;
  userId?: string;
  context: {
    category: string;
    actionType?: string;
    query?: string;
  };
}

export interface DistrictGraph {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  metadata: {
    districtId: number;
    version: number;
    lastUpdated: number;
    nodeCount: number;
    relationshipCount: number;
    coverage: number; // 0-1, how complete the graph is
  };
}

export interface GraphQuery {
  nodeType?: GraphNodeType;
  relationshipType?: GraphRelationshipType;
  filters?: Record<string, any>;
  limit?: number;
  sortBy?: string;
  includeMetadata?: boolean;
}

export interface GraphUpdate {
  operation: 'add_node' | 'update_node' | 'delete_node' | 'add_relationship' | 'update_relationship' | 'delete_relationship';
  data: GraphNode | GraphRelationship;
  timestamp: number;
  source: string;
}

export interface MemorySummarization {
  type: 'demand_trend' | 'supply_gap' | 'trust_shift' | 'locality_pattern';
  locality?: string;
  category?: string;
  summary: string;
  confidence: number; // 0-1
  timeWindow: {
    start: number;
    end: number;
  };
  supportingEvidence: {
    signalCount: number;
    keyIndicators: string[];
    trendDirection: 'rising' | 'falling' | 'stable';
    impact: 'low' | 'medium' | 'high';
  };
}