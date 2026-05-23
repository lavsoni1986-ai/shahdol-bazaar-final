/**
 * EXECUTION INTELLIGENCE TYPES
 * BharatOS Phase 4 - Execution Intelligence Foundation
 *
 * Types for execution-aware district intelligence system
 */

export interface ExecutionSignal {
  id: string;
  type: ExecutionActionType;
  vendorId: number;
  userId?: string;
  sessionId?: string;
  districtId: number;
  timestamp: number;
  metadata: ExecutionMetadata;
  source: 'frontend' | 'api' | 'backend';
}

export interface ActionExecution {
  id: string;
  actionType: ExecutionActionType;
  vendorId: number;
  userId?: string;
  sessionId?: string;
  districtId: number;
  timestamp: number;
  success: boolean;
  duration?: number; // in milliseconds
  metadata: ExecutionMetadata;
  outcome?: InteractionOutcome;
}

export interface VendorReliabilitySignal {
  vendorId: number;
  districtId: number;
  totalInteractions: number;
  repeatedInteractions: number; // interactions with same user
  executionFrequency: number; // interactions per day (rolling average)
  actionConversionRate: Record<ExecutionActionType, number>; // conversion rates per action type
  lastInteraction: number;
  firstInteraction: number;
  interactionHistory: Array<{
    timestamp: number;
    actionType: ExecutionActionType;
    success: boolean;
  }>;
}

export interface InteractionOutcome {
  id: string;
  executionId: string;
  outcome: 'success' | 'failure' | 'timeout' | 'cancelled' | 'unknown';
  reason?: string;
  timestamp: number;
  followUpActions?: ExecutionActionType[];
  metadata: Record<string, any>;
}

export type ExecutionActionType =
  | 'call_vendor'
  | 'whatsapp_vendor'
  | 'map_open'
  | 'order_created'
  | 'view_product'
  | 'add_to_cart'
  | 'search'
  | 'visit_store';

export interface ExecutionMetadata {
  query?: string;
  productId?: number;
  category?: string;
  searchTerms?: string[];
  recommendationId?: string;
  position?: number; // position in recommendation list
  sessionDuration?: number;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: any;
}

export interface ExecutionMetrics {
  vendorId: number;
  districtId: number;
  period: {
    start: number;
    end: number;
  };
  actions: Record<ExecutionActionType, {
    count: number;
    successRate: number;
    averageDuration: number;
    conversionRate: number;
  }>;
  trends: {
    interactionGrowth: number; // percentage change
    conversionImprovement: number; // percentage change
    reliabilityScore: number; // 0-100
  };
}