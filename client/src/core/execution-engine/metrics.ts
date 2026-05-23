/**
 * VENDOR INTERACTION METRICS FOUNDATION
 * BharatOS Phase 4 - Execution Intelligence Foundation
 *
 * Foundation for tracking vendor interaction metrics.
 * NO scoring calculations yet - only data structures.
 */

import { ExecutionActionType } from '../execution/types';

export interface VendorInteractionMetrics {
  vendorId: number;
  districtId: number;
  period: {
    start: number; // timestamp
    end: number;   // timestamp
  };

  // Raw counts
  totalInteractions: number;
  repeatedInteractions: number; // interactions with same user
  uniqueUsers: number;

  // Action breakdown
  actions: Record<ExecutionActionType, {
    count: number;
    uniqueUsers: number;
    averagePerUser: number;
  }>;

  // Temporal patterns
  executionFrequency: {
    daily: number;    // average interactions per day
    weekly: number;   // average interactions per week
    hourly: Record<number, number>; // interactions by hour of day
  };

  // Conversion metrics (foundation only)
  actionConversionRate: Record<ExecutionActionType, {
    attempted: number;
    successful: number;
    rate: number; // will be calculated later
  }>;

  // Interaction history (for future analysis)
  recentInteractions: Array<{
    timestamp: number;
    actionType: ExecutionActionType;
    userId?: string;
    sessionId?: string;
    success: boolean;
  }>;

  // Metadata
  lastUpdated: number;
  dataCompleteness: number; // 0-1, how complete the data is
}

/**
 * Metrics collection configuration
 */
export interface MetricsCollectionConfig {
  vendorId: number;
  districtId: number;
  collectionPeriod: {
    days: number; // how many days of history to collect
    maxRecords: number; // max records to keep in memory
  };
  enabledMetrics: ExecutionActionType[];
}

/**
 * Future: Execution-weighted ranking preparation
 */
export interface ExecutionWeightedScore {
  vendorId: number;
  baseScore: number; // current ranking score
  executionMultiplier: number; // calculated from interaction metrics
  finalScore: number; // baseScore * executionMultiplier
  factors: {
    interactionVolume: number;
    conversionQuality: number;
    temporalConsistency: number;
    userRetention: number;
  };
}