/**
 * ADAPTIVE RANKING TYPES
 * BharatOS Phase 6 - Adaptive Trust & Ranking Foundation
 *
 * Core types for execution-weighted trust and adaptive ranking system
 */

export interface RankingSignal {
  id: string;
  type: RankingSignalType;
  vendorId: number;
  query: string;
  userId?: string;
  districtId: number;
  value: number; // signal strength 0-1
  confidence: number; // signal reliability 0-1
  timestamp: number;
  context: {
    category?: string;
    locality?: string;
    timeOfDay?: number;
    dayOfWeek?: number;
    searchPosition?: number;
  };
}

export type RankingSignalType =
  | 'semantic_relevance'
  | 'dssl_trust'
  | 'execution_frequency'
  | 'repeat_interaction'
  | 'failed_interaction'
  | 'locality_reliability'
  | 'demand_alignment'
  | 'temporal_relevance'
  | 'competition_proximity'
  | 'user_satisfaction';

export interface TrustSignal {
  vendorId: number;
  districtId: number;
  signalType: TrustSignalType;
  value: number; // trust score contribution
  weight: number; // importance of this signal
  timestamp: number;
  evidence: {
    count: number;
    successRate: number;
    timeWindow: {
      start: number;
      end: number;
    };
  };
}

export type TrustSignalType =
  | 'dssl_base'
  | 'execution_success'
  | 'repeat_usage'
  | 'response_frequency'
  | 'failure_rate'
  | 'citizen_retention'
  | 'locality_trust'
  | 'temporal_reliability';

export interface ExecutionScore {
  vendorId: number;
  districtId: number;
  totalScore: number; // 0-1
  components: {
    frequency: number; // execution volume
    success: number; // success rate
    retention: number; // repeat usage
    responsiveness: number; // response speed
    consistency: number; // temporal reliability
  };
  metadata: {
    calculationTimestamp: number;
    dataPoints: number;
    confidence: number;
    lastExecution: number;
  };
}

export interface LocalityScore {
  vendorId: number;
  locality: string;
  districtId: number;
  relevanceScore: number; // 0-1, how relevant to this locality
  trustScore: number; // 0-1, trust level in this locality
  demandFit: number; // 0-1, how well matches local demand
  competitionLevel: number; // 0-1, market concentration
  temporalAlignment: number; // 0-1, time-based relevance
  metadata: {
    signalCount: number;
    lastUpdated: number;
    confidence: number;
  };
}

export interface AdaptiveRankingResult {
  vendorId: number;
  query: string;
  finalScore: number; // 0-1
  rank: number;
  componentScores: {
    semantic: number;
    trust: number;
    execution: number;
    locality: number;
    relevance: number;
    adaptive: number;
  };
  signalContributions: RankingSignal[];
  metadata: {
    calculated: number;
    districtId: number;
    userId?: string;
    confidence: number;
    fallbackUsed: boolean;
  };
}

export interface RankingWeights {
  semantic: number; // 0-1
  trust: number; // 0-1
  execution: number; // 0-1
  locality: number; // 0-1
  relevance: number; // 0-1
  adaptive: number; // 0-1, for future ML
}

export interface RankingContext {
  query: string;
  userId?: string;
  districtId: number;
  locality?: string;
  category?: string;
  timeOfDay: number;
  dayOfWeek: number;
  intent: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface VendorRankingProfile {
  vendorId: number;
  districtId: number;
  baseProfile: {
    category: string;
    dsslScore: number;
    averageRating: number;
    reviewCount: number;
    priceRange: string;
  };
  adaptiveProfile: {
    executionScore: ExecutionScore;
    localityScores: Record<string, LocalityScore>;
    trustSignals: TrustSignal[];
    rankingHistory: Array<{
      query: string;
      score: number;
      rank: number;
      timestamp: number;
    }>;
  };
  metadata: {
    lastUpdated: number;
    signalCount: number;
    confidence: number;
  };
}

export interface RankingEngineConfig {
  enabledSignals: RankingSignalType[];
  weights: RankingWeights;
  minimumDataThreshold: number;
  adaptiveLearningRate: number; // 0-1
  localityInfluence: number; // 0-1
  executionWeight: number; // 0-1
  trustThreshold: number; // minimum trust score
  fallbackStrategy: 'semantic_only' | 'trust_only' | 'random';
}