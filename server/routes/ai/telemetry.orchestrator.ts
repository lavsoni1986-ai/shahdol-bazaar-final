import { Request, Response } from "express";
import { safeExecute } from "../../lib/runtime/safe-execute";
import {
  CognitionExecutionState,
  CognitionStage,
  executeEngine,
  createTelemetryTruth,
  emitTelemetry
} from '../../lib/cognition';

/**
 * Telemetry Orchestrator: Handles telemetry creation and emission
 */
export async function handleTelemetryFlow({
  req,
  res,
  rawQuery,
  executionState,
  finalResults,
  hallucinationPrevented = false,
  unmetDemand = false
}: {
  req: Request;
  res: Response;
  rawQuery: string;
  executionState: CognitionExecutionState;
  finalResults: any[];
  hallucinationPrevented?: boolean;
  unmetDemand?: boolean;
}) {
  try {
    // Ensure telemetry exists
    if (!executionState.telemetry) {
      executionState.telemetry = createTelemetryTruth({
        finalResults,
        hallucinationPrevented,
        query: rawQuery,
        unmetDemand
      });
    }

    // Telemetry creation engine
    await executeEngine(
      {
        stage: CognitionStage.TELEMETRY,
        engineName: 'telemetry',
        timeoutMs: 1000
      },
      async () => {
        executionState.telemetry = createTelemetryTruth({
          finalResults,
          hallucinationPrevented,
          query: rawQuery,
          unmetDemand
        });
        return executionState.telemetry;
      },
      executionState
    );

    // Emit telemetry (non-blocking)
    const emitFn = async () => {
      await emitTelemetry(executionState.telemetry!, {
        query: rawQuery,
        operationErrors: executionState.operationErrors
      });
    };
    await safeExecute('telemetry_emit', emitFn, executionState.operationErrors);

    return executionState;
  } catch (error) {
    throw error;
  }
}