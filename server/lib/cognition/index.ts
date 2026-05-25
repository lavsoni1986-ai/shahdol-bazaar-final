// Cognition Engine Barrel Export
// BharatOS Phase 4 - Unified Engine Interface

// Runtime
export { CognitionStage, createExecutionState } from './runtime-state';
export type { CognitionError, CognitionExecutionState } from './runtime-state';
// Canonical CognitionResult from single source of truth
export type { CognitionResult } from './types';
export { advanceStage, failStage, validateExecutionState, executeEngine } from './runtime-orchestrator';
export { finalizeCognitionResponse } from './response-finalizer';

// Engines - explicit exports (no export * to avoid barrel ambiguity)
export { ENGINE_VERSION as INTENT_ENGINE_VERSION, QueryIntent as IntentQueryIntent, classifyQueryIntent } from './intent.engine';
export type { IntentClassification } from './intent.engine';
export { ENGINE_VERSION as GROUNDING_ENGINE_VERSION, groundQuery } from './grounding.engine';
export type { GroundingResult, GroundingContext } from './grounding.engine';
export { ENGINE_VERSION as RANKING_ENGINE_VERSION, calculateRelevanceScore } from './ranking.engine';
export type { RankedEntity, DiscoveryEntity } from './ranking.engine';
export {
  ENGINE_VERSION as CONFIDENCE_ENGINE_VERSION,
  calculateConfidence,
  calculateConfidenceV2,
  validateSemanticRelevance,
  buildConfidenceResult,
} from './confidence.engine';
export type { ConfidenceContext, SemanticValidationResult, ConfidenceRationale } from './confidence.engine';
export { ENGINE_VERSION as SYNTHESIS_ENGINE_VERSION, synthesizeResponse } from './response-synthesis.engine';
export {
  ENGINE_VERSION as TELEMETRY_ENGINE_VERSION,
  createTelemetryTruth,
  validateTelemetryTruth,
  emitTelemetry,
} from './telemetry.engine';
export type { TelemetryTruth, TelemetryContext } from './telemetry.engine';
