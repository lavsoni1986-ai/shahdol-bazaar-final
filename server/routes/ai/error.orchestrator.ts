import { Request, Response } from "express";
import { ErrorCode, sendError } from "../../middleware/errorHandler";
import { bharatOSLogger, LogComponent } from "../../lib/logging/structured-logger";
import {
  CognitionExecutionState,
  failStage,
  finalizeCognitionResponse
} from '../../lib/cognition';

/**
 * Error Orchestrator: Handles failStage and finalization for error cases
 */
export async function handleErrorFlow({
  req,
  res,
  error,
  executionState
}: {
  req: Request;
  res: Response;
  error: any;
  executionState: CognitionExecutionState;
}) {
  try {
    console.error('Cognition pipeline error:', error);

    // Fail the current stage if not already failed
    if (executionState.currentStage !== 'FAILED') {
      failStage(executionState, executionState.currentStage, error.message || 'Unexpected error');
    }

    // Log the error
    bharatOSLogger.error(LogComponent.COGNITION, 'cognition_pipeline_error', 'Cognition pipeline failed', {
      error: error.message,
      stage: executionState.currentStage,
      operationErrors: executionState.operationErrors
    });

    // If we have a response already synthesized, try to finalize it
    if (executionState.response) {
      return finalizeCognitionResponse(res, executionState);
    }

    // Otherwise, send generic error
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Cognition pipeline failed unexpectedly");
  } catch (finalizationError) {
    // If finalization itself fails, send basic error
    console.error('Error finalization failed:', finalizationError);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Critical system error");
  }
}