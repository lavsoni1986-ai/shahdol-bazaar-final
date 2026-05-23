/**
 * ADAPTIVE RANKING ARCHITECTURE PREPARATION
 * BharatOS Phase 6 - Adaptive Trust & Ranking Foundation
 *
 * Prepares the architecture for future adaptive ranking system.
 * NO ranking logic changes in this phase.
 */

import { RankingContext, AdaptiveRankingResult, RankingWeights, RankingEngineConfig } from '../../ranking/types';
import { VendorTrustProfile } from './vendor-trust-aggregation';
import { FailureIntelligence } from './failure-intelligence';

export interface AdaptiveRankingArchitecture {
  // Signal processing pipeline
  processRankingRequest(context: RankingContext): Promise<RankingPipelineResult>;

  // Component score calculation (foundation only)
  calculateSemanticScore(query: string, candidate: any, context: RankingContext): Promise<number>;
  calculateTrustScore(vendorId: number, districtId: number, context: RankingContext): Promise<number>;
  calculateExecutionScore(vendorId: number, districtId: number, context: RankingContext): Promise<number>;
  calculateLocalityScore(vendorId: number, locality: string, districtId: number): Promise<number>;
  calculateRelevanceScore(candidate: any, context: RankingContext): Promise<number>;

  // Adaptive learning preparation (no-op in foundation)
  learnFromOutcome(result: AdaptiveRankingResult, actualOutcome: any): Promise<void>;
  updateWeightsFromFeedback(feedback: RankingFeedback): Promise<void>;

  // Architecture validation
  validateRankingArchitecture(): Promise<ArchitectureValidation>;
}

export interface RankingPipelineResult {
  context: RankingContext;
  candidates: RankingCandidate[];
  componentScores: {
    semantic: Record<number, number>; // candidateId -> score
    trust: Record<number, number>;
    execution: Record<number, number>;
    locality: Record<number, number>;
    relevance: Record<number, number>;
  };
  aggregatedScores: Record<number, number>; // candidateId -> final score
  ranking: RankingCandidate[];
  metadata: {
    processingTime: number;
    signalsUsed: number;
    confidence: number;
    fallbackUsed: boolean;
  };
}

export interface RankingCandidate {
  id: number;
  type: 'vendor' | 'product' | 'service';
  baseData: any; // existing vendor/product data

  // Component scores (calculated separately)
  scores: {
    semantic: number;
    trust: number;
    execution: number;
    locality: number;
    relevance: number;
    adaptive: number; // for future ML
  };

  // Metadata
  metadata: {
    position: number;
    confidence: number;
    signals: number;
    lastUpdated: number;
  };
}

export interface RankingFeedback {
  originalRanking: AdaptiveRankingResult;
  actualOutcome: {
    clickedCandidate?: number;
    executedAction?: string;
    successfulExecution?: boolean;
    userSatisfaction?: number;
    timeToAction: number;
  };
  context: RankingContext;
  timestamp: number;
}

export interface ArchitectureValidation {
  components: {
    signalProcessing: 'healthy' | 'degraded' | 'failed';
    trustAggregation: 'healthy' | 'degraded' | 'failed';
    executionTracking: 'healthy' | 'degraded' | 'failed';
    localityIntelligence: 'healthy' | 'degraded' | 'failed';
    failureIntelligence: 'healthy' | 'degraded' | 'failed';
  };

  dataQuality: {
    signalCompleteness: number; // 0-1
    trustDataCoverage: number; // 0-1
    executionDataCoverage: number; // 0-1
    localityDataCoverage: number; // 0-1
  };

  performance: {
    averageProcessingTime: number; // in ms
    memoryUsage: number; // in MB
    cacheHitRate: number; // 0-1
  };

  recommendations: Array<{
    component: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;

  overallHealth: 'healthy' | 'needs_attention' | 'critical';
}

// Future ranking engine interface
export interface FutureRankingEngine {
  // Core ranking
  rankCandidates(candidates: any[], context: RankingContext): Promise<AdaptiveRankingResult>;

  // Component scoring
  calculateComponentScores(candidates: any[], context: RankingContext): Promise<Record<string, Record<number, number>>>;

  // Score aggregation
  aggregateScores(componentScores: Record<string, Record<number, number>>, weights: RankingWeights): Promise<Record<number, number>>;

  // Adaptive learning
  learnFromInteractions(interactions: any[]): Promise<void>;
  updateModelParameters(feedback: RankingFeedback[]): Promise<void>;

  // Configuration management
  updateConfig(config: RankingEngineConfig): Promise<void>;
  getCurrentConfig(): Promise<RankingEngineConfig>;

  // Performance monitoring
  getPerformanceMetrics(): Promise<RankingPerformanceMetrics>;
  optimizePerformance(): Promise<void>;
}

export interface RankingPerformanceMetrics {
  throughput: number; // rankings per second
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
  accuracy: {
    rankingQuality: number; // 0-1
    userSatisfaction: number; // 0-1
    conversionRate: number; // 0-1
  };
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // in MB
    disk: number; // in MB
  };
  cacheMetrics: {
    hitRate: number; // 0-1
    size: number;
    evictions: number;
  };
}

// Ranking pipeline stages
export enum RankingStage {
  SIGNAL_COLLECTION = 'signal_collection',
  CONTEXT_ENRICHMENT = 'context_enrichment',
  CANDIDATE_FILTERING = 'candidate_filtering',
  COMPONENT_SCORING = 'component_scoring',
  SCORE_AGGREGATION = 'score_aggregation',
  RANKING_SORTING = 'ranking_sorting',
  RESULT_ENRICHMENT = 'result_enrichment',
  FEEDBACK_COLLECTION = 'feedback_collection',
}

export interface RankingPipelineStage {
  stage: RankingStage;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  timeout: number; // in ms
  retryCount: number;
  fallbackBehavior: 'skip' | 'use_default' | 'fail_pipeline';
}

// Adaptive learning preparation
export interface AdaptiveLearningConfig {
  enabled: boolean;
  learningRate: number; // 0-1
  feedbackWindow: number; // in hours
  minimumFeedbackCount: number;
  modelUpdateFrequency: string; // 'realtime' | 'hourly' | 'daily'
  ABLearning: boolean; // A/B testing for ranking changes
  gradualRollout: boolean; // gradual vs immediate changes
  performanceMonitoring: boolean;
  automaticRollback: boolean; // rollback if performance degrades
  rollbackThreshold: number; // performance degradation threshold
}

// Ranking experimentation framework
export interface RankingExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'failed';

  // Experiment design
  hypothesis: string;
  controlGroup: RankingWeights;
  treatmentGroup: RankingWeights;
  targetMetric: 'satisfaction' | 'conversion' | 'engagement' | 'revenue';

  // Population
  trafficAllocation: number; // 0-1 percentage
  userSegments: string[];
  geographicScope: string[];

  // Duration and monitoring
  startDate: number;
  endDate: number;
  minimumSampleSize: number;
  statisticalSignificance: number; // required p-value

  // Results
  results?: {
    controlMetrics: Record<string, number>;
    treatmentMetrics: Record<string, number>;
    statisticalSignificance: number;
    confidence: number; // 0-1
    winner: 'control' | 'treatment' | 'inconclusive';
    insights: string[];
  };
}