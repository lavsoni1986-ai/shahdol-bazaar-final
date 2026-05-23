/**
 * FAILURE INTELLIGENCE FOUNDATION
 * BharatOS Phase 6 - Adaptive Trust & Ranking Foundation
 *
 * Tracks and analyzes failures to improve ranking intelligence.
 * Foundation for learning from unsuccessful interactions.
 */

import { ExecutionSignal } from '../../execution/types';
import { RankingSignal, RankingSignalType } from '../types';

export interface FailureIntelligenceEngine {
  // Failure detection and classification
  detectFailures(query: string, recommendations: any[], executions: ExecutionSignal[]): Promise<FailurePattern[]>;

  // Failure analysis
  analyzeFailurePattern(pattern: FailurePattern): Promise<FailureAnalysis>;
  aggregateFailureIntelligence(districtId: number, timeWindow: { start: number; end: number }): Promise<FailureIntelligence>;

  // Learning from failures
  generateFailureInsights(failures: FailurePattern[]): Promise<FailureInsight[]>;
  updateRankingFromFailures(failures: FailurePattern[]): Promise<void>; // No-op in foundation phase

  // Failure prediction
  predictPotentialFailures(query: string, recommendations: any[]): Promise<FailurePrediction[]>;

  // Recovery suggestions
  suggestFailureMitigations(failures: FailurePattern[]): Promise<FailureMitigation[]>;
}

export interface FailurePattern {
  id: string;
  type: FailureType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  context: {
    query: string;
    userId?: string;
    districtId: number;
    locality?: string;
    category?: string;
  };

  // What failed
  failedEntity: {
    type: 'vendor' | 'product' | 'category';
    id: number;
    name: string;
  };

  // Failure metrics
  metrics: {
    shown: boolean; // was it shown to user?
    clicked: boolean; // was it clicked?
    executed: boolean; // was action taken?
    completed: boolean; // was action completed successfully?
    timeToFailure: number; // time from show to failure
  };

  // Failure characteristics
  characteristics: {
    position: number; // position in recommendation list
    competition: number; // how many alternatives were there
    trust: number; // trust score of failed entity
    relevance: number; // relevance score
    distance?: number; // physical distance if applicable
  };
}

export type FailureType =
  | 'shown_unused' // recommendation shown but ignored
  | 'clicked_abandoned' // clicked but no action taken
  | 'executed_failed' // action started but failed
  | 'grounding_failed' // couldn't ground to real entity
  | 'unresolved_query' // query couldn't be satisfied
  | 'repeated_failure' // same failure pattern repeats
  | 'locality_mismatch' // wrong locality for the need
  | 'trust_mismatch' // trust expectations not met
  | 'timing_issue' // wrong time for the service
  | 'capacity_issue' // vendor at capacity
  | 'quality_issue' // service quality problems;

export interface FailureAnalysis {
  pattern: FailurePattern;

  // Root cause analysis
  rootCause: {
    primary: string;
    contributing: string[];
    confidence: number; // 0-1
  };

  // Impact assessment
  impact: {
    userExperience: number; // 0-1, how bad for user
    systemReliability: number; // 0-1, damage to trust
    opportunityCost: number; // potential value lost
    learningValue: number; // how much we can learn
  };

  // Pattern recognition
  similarFailures: {
    count: number;
    timeWindow: { start: number; end: number };
    commonCharacteristics: string[];
  };

  // Corrective actions suggested
  suggestedActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number; // 0-1
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface FailureIntelligence {
  districtId: number;
  timeWindow: { start: number; end: number };

  // Overall failure metrics
  failureMetrics: {
    totalFailures: number;
    failureRate: number; // failures / total recommendations
    criticalFailureRate: number;
    failureTrend: 'improving' | 'stable' | 'worsening';
  };

  // Failure patterns by type
  failurePatterns: Record<FailureType, {
    count: number;
    percentage: number;
    severity: number; // average severity
    trend: 'rising' | 'stable' | 'falling';
  }>;

  // Failure patterns by category
  categoryFailures: Record<string, {
    failureRate: number;
    commonFailureTypes: FailureType[];
    averageSeverity: number;
  }>;

  // Failure patterns by locality
  localityFailures: Record<string, {
    failureRate: number;
    commonFailureTypes: FailureType[];
    underservedIndicators: boolean;
  }>;

  // Vendor failure patterns
  vendorFailures: Array<{
    vendorId: number;
    failureRate: number;
    commonFailures: FailureType[];
    reliabilityImpact: number; // 0-1
  }>;

  // Temporal failure patterns
  temporalFailures: {
    byHour: Record<number, number>; // hour -> failure rate
    byDay: Record<number, number>; // day -> failure rate
    peakFailureHours: number[];
    seasonalPatterns: Record<string, number>;
  };

  // Failure insights
  insights: {
    systemicIssues: string[]; // district-wide problems
    categoryIssues: Record<string, string[]>; // category-specific problems
    localityIssues: Record<string, string[]>; // locality-specific problems
    vendorIssues: Record<number, string[]>; // vendor-specific problems
  };

  metadata: {
    analyzedSignals: number;
    confidence: number; // 0-1
    lastUpdated: number;
    dataCompleteness: number; // 0-1
  };
}

export interface FailureInsight {
  id: string;
  type: 'pattern_recognition' | 'root_cause' | 'trend_analysis' | 'predictive_warning';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1

  // What was discovered
  discovery: {
    affectedEntities: Array<{
      type: 'vendor' | 'category' | 'locality';
      id: string | number;
      name: string;
    }>;
    timeScope: { start: number; end: number };
    dataPoints: number;
  };

  // Business impact
  impact: {
    userExperience: number;
    systemPerformance: number;
    businessValue: number;
    learningOpportunity: number;
  };

  // Recommended actions
  recommendations: Array<{
    action: string;
    rationale: string;
    expectedBenefit: number; // 0-1
    implementationEffort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;

  // Evidence and validation
  evidence: {
    supportingData: Record<string, any>;
    statisticalSignificance: number; // 0-1
    alternativeExplanations: string[];
    validationMethods: string[];
  };

  metadata: {
    generated: number;
    expires: number; // when insight becomes stale
    refreshFrequency: string; // how often to re-evaluate
  };
}

export interface FailurePrediction {
  entityId: number; // vendor or category id
  entityType: 'vendor' | 'category';
  failureType: FailureType;
  probability: number; // 0-1
  confidence: number; // 0-1
  timeHorizon: number; // in hours

  // Prediction context
  context: {
    query: string;
    locality?: string;
    timeOfDay: number;
    historicalPrecedents: number;
  };

  // Risk assessment
  risk: {
    impact: number; // 0-1
    likelihood: number; // 0-1
    detectability: number; // 0-1
  };

  // Prevention strategies
  prevention: Array<{
    strategy: string;
    effectiveness: number; // 0-1
    cost: 'low' | 'medium' | 'high';
  }>;
}

export interface FailureMitigation {
  failurePattern: FailurePattern;
  mitigationType: 'preventive' | 'corrective' | 'compensatory';

  // Mitigation strategy
  strategy: {
    description: string;
    primaryAction: string;
    supportingActions: string[];
    responsibleParty: string;
  };

  // Expected outcomes
  expectedOutcomes: {
    successRate: number; // 0-1
    userSatisfaction: number;
    systemImprovement: number;
    timeToResolution: number; // in hours
  };

  // Implementation details
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    requiredResources: string[];
    timeline: string;
    cost: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
  };

  // Success metrics
  successMetrics: Array<{
    metric: string;
    baseline: number;
    target: number;
    measurementPeriod: string;
  }>;

  // Monitoring and adjustment
  monitoring: {
    frequency: string;
    responsible: string;
    adjustmentTriggers: string[];
  };
}

// Failure intelligence configuration
export interface FailureIntelligenceConfig {
  enabled: boolean;
  detection: {
    minimumFailureThreshold: number;
    criticalFailureThreshold: number;
    analysisTimeWindow: number; // in hours
    minimumDataPoints: number;
  };

  classification: {
    autoClassificationEnabled: boolean;
    manualReviewThreshold: number;
    confidenceThreshold: number; // 0-1
  };

  learning: {
    patternRecognitionEnabled: boolean;
    predictiveModelingEnabled: boolean;
    feedbackLoopEnabled: boolean;
  };

  alerting: {
    criticalFailureAlert: boolean;
    patternAlertThreshold: number;
    escalationThreshold: number;
  };
}