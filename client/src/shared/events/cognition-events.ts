/**
 * CANONICAL COGNITION EVENT DEFINITIONS
 * BharatOS Phase 3 - Cognition Extraction Foundation
 *
 * Standardized event types for cognition telemetry
 */

import { EventType } from './types';

export const COGNITION_EVENTS = {
  // User interaction events
  USER_QUERY: 'user_query',
  AI_CLASSIFICATION: 'ai_classification',

  // Grounding events
  GROUNDING_SUCCESS: 'grounding_success',
  GROUNDING_FAILURE: 'grounding_failure',
  ENTITY_EXTRACTED: 'entity_extracted',

  // Action events
  ACTION_EXECUTED: 'action_executed',

  // Demand detection
  DEMAND_DETECTED: 'demand_detected',
  SIGNAL_CAPTURED: 'signal_captured',

  // Processing events
  QUERY_NORMALIZED: 'query_normalized',
  RANKING_APPLIED: 'ranking_applied',
  TRUST_SCORED: 'trust_scored',
} as const;

export type CognitionEventType = typeof COGNITION_EVENTS[keyof typeof COGNITION_EVENTS];

// Event payload interfaces
export interface UserQueryEvent {
  type: typeof COGNITION_EVENTS.USER_QUERY;
  query: string;
  normalizedQuery: string;
  intent: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  timestamp: number;
  userId?: string;
  districtSlug: string;
}

export interface GroundingSuccessEvent {
  type: typeof COGNITION_EVENTS.GROUNDING_SUCCESS;
  query: string;
  groundedEntity: {
    type: string;
    id: number;
    name: string;
  };
  confidence: number;
  sources: string[];
  timestamp: number;
  userId?: string;
  districtSlug: string;
}

export interface GroundingFailureEvent {
  type: typeof COGNITION_EVENTS.GROUNDING_FAILURE;
  query: string;
  attemptedGrounding: string;
  reason: string;
  timestamp: number;
  userId?: string;
  districtSlug: string;
}

export interface ActionExecutedEvent {
  type: typeof COGNITION_EVENTS.ACTION_EXECUTED;
  action: string;
  vendorId: number;
  query: string;
  timestamp: number;
  userId?: string;
  districtSlug: string;
  metadata?: Record<string, any>;
}

export interface DemandDetectedEvent {
  type: typeof COGNITION_EVENTS.DEMAND_DETECTED;
  signalType: string;
  productId?: number;
  vendorId?: number;
  category?: string;
  weight: number;
  timestamp: number;
  userId?: string;
  districtSlug: string;
}

export type CognitionEvent =
  | UserQueryEvent
  | GroundingSuccessEvent
  | GroundingFailureEvent
  | ActionExecutedEvent
  | DemandDetectedEvent;