import { CognitionStage } from "./runtime-state";
import { executeEngine } from "./runtime-orchestrator";
import { createTelemetryTruth } from "./telemetry.engine";
import { finalizeCognitionResponse } from "./response-finalizer";

/**
 * 🛡️ Sovereign No-Result Orchestrator
 * Ensures even data-gaps follow cognitive discipline.
 */
export async function handleNoResultFlow({
  executionState,
  rawQuery,
  customMessage,
  res
}: any) {
  // 🛡️ Idempotency guard: prevent double orchestration
  const illegalStages = [
    CognitionStage.RESPONSE_SYNTHESIS,
    CognitionStage.RESPONSE_FINALIZATION,
    CognitionStage.COMPLETE
  ];

  if (illegalStages.includes(executionState.currentStage)) {
    console.warn('[NO_RESULT_ORCHESTRATOR] Idempotency triggered: already synthesized, finalizing directly');
    return finalizeCognitionResponse(res, executionState);
  }

  // 1. CONFIDENCE: Define internal audit rationale for empty results
  await executeEngine(
    {
      stage: CognitionStage.CONFIDENCE,
      engineName: "confidence",
      timeoutMs: 1000
    },
    async () => {
      executionState.confidenceRationale = {
        label: "LOW",
        reasons: ["no_grounded_entities_found", "unmet_district_demand"]
      };
      executionState.confidenceResult = 0.3;
      return executionState.confidenceResult;
    },
    executionState
  );

  // 2. TELEMETRY: Record the district intelligence gap
  await executeEngine(
    {
      stage: CognitionStage.TELEMETRY,
      engineName: "telemetry",
      timeoutMs: 1000
    },
    async () => {
      executionState.telemetry = createTelemetryTruth({
        finalResults: [],
        hallucinationPrevented: true,
        query: rawQuery,
        unmetDemand: true
      });
      return executionState.telemetry;
    },
    executionState
  );

  // 3. SYNTHESIS: Humanized "Not Found" with Actionable Intent
  await executeEngine(
    {
      stage: CognitionStage.RESPONSE_SYNTHESIS,
      engineName: "response-synthesis",
      timeoutMs: 3000
    },
    async () => {
      executionState.synthesis = {
        answer: customMessage || "शहडोल में अभी इस सेवा की verified जानकारी उपलब्ध नहीं है। हमने इसे अपनी demand learning में जोड़ लिया है।",
        hasAIResponse: true
      };
      return executionState.synthesis;
    },
    executionState
  );

  return executionState;
}