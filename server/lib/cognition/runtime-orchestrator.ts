// Cognition Runtime Orchestrator
// BharatOS Phase 4 - Deterministic Execution

import { CognitionExecutionState, CognitionStage, CognitionError } from './runtime-state';
import { bharatOSLogger, LogComponent } from '../logging/structured-logger';

// Fatal error for cognition pipeline failures
export class CognitionFatalError extends Error {
  constructor(
    public stage: CognitionStage,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CognitionFatalError';
  }
}

// Enforced state machine transitions
const ALLOWED_TRANSITIONS: Record<CognitionStage, CognitionStage[]> = {
  [CognitionStage.INIT]: [CognitionStage.NORMALIZATION],
  [CognitionStage.NORMALIZATION]: [CognitionStage.INTENT_PARSING],
  [CognitionStage.INTENT_PARSING]: [CognitionStage.DOMAIN_CLASSIFICATION],
  [CognitionStage.DOMAIN_CLASSIFICATION]: [CognitionStage.GROUNDING],
  [CognitionStage.GROUNDING]: [CognitionStage.RANKING],
  [CognitionStage.RANKING]: [CognitionStage.VALIDATION],
  [CognitionStage.VALIDATION]: [CognitionStage.CONFIDENCE],
  [CognitionStage.CONFIDENCE]: [CognitionStage.TELEMETRY],
  [CognitionStage.TELEMETRY]: [CognitionStage.RESPONSE_SYNTHESIS],
  [CognitionStage.RESPONSE_SYNTHESIS]: [CognitionStage.RESPONSE_FINALIZATION],
  [CognitionStage.RESPONSE_FINALIZATION]: [CognitionStage.COMPLETE],
  [CognitionStage.COMPLETE]: [],
  [CognitionStage.FAILED]: []
};

// Freeze FSM transitions to prevent runtime corruption
Object.freeze(ALLOWED_TRANSITIONS);

export function advanceStage(executionState: CognitionExecutionState, newStage: CognitionStage): void {
  if (executionState.currentStage === CognitionStage.FAILED) {
    return; // No transitions from failed state
  }

  // Validate transition
  const allowedNext = ALLOWED_TRANSITIONS[executionState.currentStage] || [];
  if (!allowedNext.includes(newStage)) {
    // FSM VIOLATION - Log critical governance breach
    bharatOSLogger.error(LogComponent.COGNITION, 'fsm_violation_attempt',
      'FSM transition violation detected', {
        attemptedTransition: `${executionState.currentStage} → ${newStage}`,
        allowedTransitions: allowedNext,
        executionId: executionState.id,
        timestamp: Date.now()
      });
    failStage(executionState, executionState.currentStage,
      `Invalid stage transition: ${executionState.currentStage} → ${newStage}`);
    return;
  }

  // Complete current stage timing
  const currentMetrics = executionState.stageMetrics[executionState.currentStage];
  if (currentMetrics) {
    currentMetrics.completedAt = Date.now();
    currentMetrics.durationMs = currentMetrics.completedAt - currentMetrics.startedAt;
  }

  // Update trace
  const currentTraceStage = executionState.trace.stages.find(s => s.stage === executionState.currentStage);
  if (currentTraceStage) {
    currentTraceStage.completedAt = Date.now();
    currentTraceStage.durationMs = currentTraceStage.completedAt - currentTraceStage.startedAt;
  }

  // Start new stage timing
  const newStartedAt = Date.now();
  executionState.stageMetrics[newStage] = { startedAt: newStartedAt };
  executionState.trace.stages.push({
    stage: newStage,
    startedAt: newStartedAt,
    status: 'success'
  });

  // Advance stage
  executionState.completedStages.push(executionState.currentStage);
  executionState.currentStage = newStage;

  bharatOSLogger.info(LogComponent.COGNITION, 'stage_advanced', 'Cognition stage transition', {
    fromStage: executionState.completedStages[executionState.completedStages.length - 1],
    toStage: newStage,
    completedStages: executionState.completedStages.length,
    stageTimings: Object.fromEntries(
      Object.entries(executionState.stageMetrics)
        .filter(([, metrics]) => metrics.durationMs)
        .map(([stage, metrics]) => [stage, metrics.durationMs])
    )
  });
}

export function failStage(
  executionState: CognitionExecutionState,
  stage: CognitionStage,
  error: string,
  errorCode: string = 'UNKNOWN_ERROR',
  fatal: boolean = true
): void {
  executionState.currentStage = CognitionStage.FAILED;
  executionState.failedStage = stage;

  const cognitionError: CognitionError = {
    stage,
    severity: 'CRITICAL',
    recoverable: false,
    code: errorCode,
    message: error,
    timestamp: Date.now()
  };

  executionState.errors.push(cognitionError);
  executionState.trace.errors.push(cognitionError);

  // Update trace stage status
  const traceStage = executionState.trace.stages.find(s => s.stage === stage);
  if (traceStage) {
    traceStage.status = 'failed';
    traceStage.error = error;
  }

  bharatOSLogger.error(LogComponent.COGNITION, 'stage_failed', 'Cognition stage failed', {
    failedStage: stage,
    errorCode,
    error,
    totalErrors: executionState.errors.length,
    stageTimings: Object.fromEntries(
      Object.entries(executionState.stageMetrics)
        .map(([stage, metrics]) => [stage, {
          durationMs: metrics.completedAt ? metrics.completedAt - metrics.startedAt : Date.now() - metrics.startedAt
        }])
    )
  });

  // Throw fatal error to halt execution
  if (fatal) {
    const fatalError = new CognitionFatalError(stage, errorCode, error);
    console.error(`Stage ${stage} failed: ${error}`, { errorCode, stack: fatalError.stack });
    throw fatalError;
  }
}

export function assertStageRequirement(executionState: CognitionExecutionState, requirement: any, message: string): void {
  if (!requirement) {
    failStage(executionState, executionState.currentStage, message);
    throw new Error(message);
  }
}

export function assertRuntimeBudget(executionState: CognitionExecutionState): void {
  const elapsed = Date.now() - executionState.startedAt;
  if (elapsed > executionState.deadlineMs) {
    failStage(executionState, executionState.currentStage,
      `Runtime budget exceeded: ${elapsed}ms > ${executionState.deadlineMs}ms`,
      'RUNTIME_BUDGET_EXCEEDED');
  }
}

export function validateExecutionState(executionState: CognitionExecutionState): void {
  // Core state validation
  assertStageRequirement(executionState, executionState.cognition?.query, "Cognition query missing");
  assertStageRequirement(executionState, executionState.cognition?.normalizedQuery, "Normalized query missing");

  // Stage-specific validations
  switch (executionState.currentStage) {
    case CognitionStage.INTENT_PARSING:
      assertStageRequirement(executionState, executionState.intentClassification, "Intent classification missing");
      break;
    case CognitionStage.CONFIDENCE:
      assertStageRequirement(executionState, executionState.confidenceResult, "Confidence result missing");
      break;
    case CognitionStage.TELEMETRY:
      assertStageRequirement(executionState, executionState.telemetry, "Telemetry data missing");
      break;
    case CognitionStage.RESPONSE_SYNTHESIS:
      assertStageRequirement(executionState, executionState.response, "Response object missing");
      break;
  }

  // Runtime budget check
  assertRuntimeBudget(executionState);
}

export interface EngineExecutionOptions {
  stage: CognitionStage;
  engineName: string;
  timeoutMs?: number;
  retries?: number;
}

export async function executeEngine<T>(
  options: EngineExecutionOptions,
  engineFn: () => Promise<T>,
  executionState: CognitionExecutionState
): Promise<T> {
  const { stage, engineName, timeoutMs = 5000, retries = 0 } = options;

  // Runtime budget check
  assertRuntimeBudget(executionState);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      advanceStage(executionState, stage);

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Engine timeout: ${engineName}`)), timeoutMs);
      });

      // Race between engine execution and timeout
      const result = await Promise.race([engineFn(), timeoutPromise]);

      // Record engine version in trace
      executionState.trace.engineVersions[engineName] = '1.0.0';

      return result;

    } catch (error: any) {
      lastError = error;

      bharatOSLogger.warn(LogComponent.COGNITION, 'engine_execution_retry', `Engine ${engineName} failed, attempt ${attempt + 1}`, {
        stage,
        engineName,
        attempt: attempt + 1,
        maxRetries: retries,
        error: error.message
      });

      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  // All retries exhausted
  failStage(executionState, stage, `Engine ${engineName} failed after ${retries + 1} attempts: ${lastError?.message}`,
    `${engineName.toUpperCase()}_EXECUTION_FAILED`);

  throw lastError;
}