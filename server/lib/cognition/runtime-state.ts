// Cognition Runtime State Management
// BharatOS Phase 4 - Deterministic Orchestration

export enum CognitionStage {
  INIT = 'INIT',
  NORMALIZATION = 'NORMALIZATION',
  INTENT_PARSING = 'INTENT_PARSING',
  DOMAIN_CLASSIFICATION = 'DOMAIN_CLASSIFICATION',
  GROUNDING = 'GROUNDING',
  RANKING = 'RANKING',
  VALIDATION = 'VALIDATION',
  CONFIDENCE = 'CONFIDENCE',
  TELEMETRY = 'TELEMETRY',
  RESPONSE_SYNTHESIS = 'RESPONSE_SYNTHESIS',
  RESPONSE_FINALIZATION = 'RESPONSE_FINALIZATION',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED'
}

export interface CognitionError {
  stage: CognitionStage;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  recoverable: boolean;
  code: string;
  message: string;
  timestamp: number;
}

export interface CognitionResult {
  query: string;
  normalizedQuery: string;
  intent: 'search' | 'route' | 'command' | 'unknown';
  entities: any[];
  confidence: number;
  metadata: Record<string, any>;
  domain?: string;
  entity?: string;
  locality?: string;
  searchTerms?: string[];
  responseMode?: string;
}

export interface ConfidenceResult {
  score: number;
  label: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
}

export interface StageMetrics {
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface CognitionTrace {
  requestId: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  stages: {
    stage: CognitionStage;
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }[];
  errors: CognitionError[];
  engineVersions: Record<string, string>;
  finalResponse?: any;
}

// Import for response type
import type { TelemetryTruth } from '../../../shared/contracts/telemetry.contract';

// ============================================
// SYNTHESIS RESULT
// ============================================
export interface SynthesisResult {
  answer: string;
  hasAIResponse: boolean;
}

// ============================================
// SEMANTIC VALIDATION RESULT
// ============================================
export interface SemanticValidation {
  isValid: boolean;
  reason: string;
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================
// STRICT CONCIERGE RESPONSE TYPE
// ============================================
export interface ConciergeResponse {
  success: boolean;
  partialSuccess?: boolean;
  answer?: string;
  results?: any[]; // TODO: Replace with UnifiedEntityDTO when defined
  products?: any[];
  grounded?: boolean;
  cognition?: CognitionResult;
  confidence?: number;
  districtInsights?: any;
  confidenceMessage?: string;
  cognitionTrace?: any;
  telemetry?: TelemetryTruth;
  operationErrors?: string[];
  error?: string;
  stage?: CognitionStage;
  code?: string;
  timestamp?: string;
  executionMetadata?: any;
}

export interface CognitionExecutionState {
  // Core state
  cognition: CognitionResult | null;
  confidenceResult: ConfidenceResult | null;
  districtIntelligence: any;
  intentClassification: any;
  normalizedIntent: string;
  allResults: any[];
  rankedResults: any[];
  grounding: any;
  telemetry: TelemetryTruth | null;
  synthesis: SynthesisResult | null;
  semanticValidation: SemanticValidation | null;
  response: ConciergeResponse | null;
  confidenceRationale: any;
  semanticRejection: boolean;

  // Runtime governance
  id: string;
  currentStage: CognitionStage;
  completedStages: CognitionStage[];
  failedStage?: CognitionStage;
  startedAt: number;
  deadlineMs: number;
  stageMetrics: Record<CognitionStage, StageMetrics>;
  errors: CognitionError[];
  operationErrors: string[];

  // Trace and versioning
  trace: CognitionTrace;
}

export function createExecutionState(): CognitionExecutionState {
  const startedAt = Date.now();
  const requestId = `cog_${startedAt}_${Math.random().toString(36).substr(2, 9)}`;

  const state: CognitionExecutionState = {
    id: requestId,
    cognition: null,
    confidenceResult: null,
    districtIntelligence: null,
    intentClassification: null,
    normalizedIntent: "DISCOVERY",
    allResults: [],
    rankedResults: [],
    grounding: null,
    telemetry: null,
    response: null as ConciergeResponse | null,
    synthesis: null as SynthesisResult | null,
    semanticValidation: null as SemanticValidation | null,
    operationErrors: [],

    // Predeclared runtime mutable fields (for Object.seal compatibility)
    confidenceRationale: null,
    semanticRejection: false,

    // Runtime governance
    currentStage: CognitionStage.INIT,
    completedStages: [],
    failedStage: undefined,
    startedAt,
    deadlineMs: 10000, // 10 second hard deadline
    stageMetrics: {} as Record<CognitionStage, StageMetrics>,
    errors: [],

    // Trace and versioning
    trace: {
      requestId,
      startedAt,
      stages: [{
        stage: CognitionStage.INIT,
        startedAt,
        status: 'success'
      }],
      errors: [],
      engineVersions: {}
    }
  };

  // Seal state shape to prevent accidental property injection
  Object.seal(state);

  // In development, freeze stage metrics to prevent runtime mutations
  if (process.env.NODE_ENV !== "production") {
    Object.seal(state);
  }

  return state;
}