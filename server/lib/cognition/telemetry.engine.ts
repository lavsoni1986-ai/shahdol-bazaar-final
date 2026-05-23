// Cognition Telemetry Engine
// BharatOS Phase 4 - Truth Verification & Observability

export const ENGINE_VERSION = "1.0.0";

import { createHash } from 'crypto';
import { bharatOSLogger, LogComponent } from '../logging/structured-logger';

export interface TelemetryTruth {
  matchedEntities: number;
  matchedEntityIds: number[];
  matchedEntityTitles: string[];
  confidence: number;
  hallucinationPrevented: boolean;
  traceHash: string;
  unmetDemand?: boolean;
}

export interface TelemetryContext {
  finalResults: any[];
  confidence: number;
  hallucinationPrevented: boolean;
  query: string;
}

export function createTelemetryTruth(context: TelemetryContext): TelemetryTruth {
  const { finalResults, confidence, hallucinationPrevented, query } = context;

  const telemetryTruth: TelemetryTruth = {
    matchedEntities: finalResults.length,
    matchedEntityIds: finalResults.map(result => result.id),
    matchedEntityTitles: finalResults.map(result => result.name || 'Unknown'),
    confidence,
    hallucinationPrevented,
    unmetDemand: false,
    traceHash: createHash('sha256')
      .update(JSON.stringify({
        matchedEntities: finalResults.length,
        matchedEntityIds: finalResults.map(result => result.id),
        query
      }))
      .digest('hex')
  };

  return telemetryTruth;
}

export function validateTelemetryTruth(uiResults: any[], telemetry: TelemetryTruth, query: string): boolean {
  const uiCount = uiResults.length;
  const telemetryCount = telemetry.matchedEntities;

  if (uiCount !== telemetryCount) {
    bharatOSLogger.error(LogComponent.COGNITION, 'telemetry_truth_assertion_failed', 'UI truth diverged from telemetry truth', {
      uiResultsCount: uiCount,
      telemetryResultsCount: telemetryCount,
      query,
      traceHash: telemetry.traceHash
    });
    return false;
  }

  return true;
}

export async function emitTelemetry(telemetry: TelemetryTruth, context: any): Promise<void> {
  // NEVER THROW - telemetry is secondary infrastructure
  try {
    bharatOSLogger.info(LogComponent.TELEMETRY, 'telemetry_truth_verified', 'Telemetry truth verified and recorded', {
      query: context.query,
      telemetry,
      operationErrors: context.operationErrors?.length > 0 ? context.operationErrors : undefined
    });
  } catch (error) {
    // Telemetry logging failed - log the failure but don't throw
    console.warn('Telemetry logging failed (non-critical):', error);
  }
}