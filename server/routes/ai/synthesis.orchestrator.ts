import { Request, Response } from "express";
import { prisma } from "../../storage";
import {
  CognitionExecutionState,
  CognitionStage,
  executeEngine,
  synthesizeResponse,
  finalizeCognitionResponse
} from '../../lib/cognition';

/**
 * Synthesis Orchestrator: Handles AI response synthesis
 */
export async function handleSynthesisFlow({
  req,
  res,
  rawQuery,
  district,
  executionState,
  vendors,
  products,
  services,
  hospitals,
  doctors,
  transportResults
}: {
  req: Request;
  res: Response;
  rawQuery: string;
  district: any;
  executionState: CognitionExecutionState;
  vendors: any[];
  products: any[];
  services: any[];
  hospitals: any[];
  doctors: any[];
  transportResults: any;
}) {
  try {
    await executeEngine(
      {
        stage: CognitionStage.RESPONSE_SYNTHESIS,
        engineName: 'response-synthesis',
        timeoutMs: 6000
      },
      async () => {
        executionState.response = (await synthesizeResponse({
          query: rawQuery,
          districtName: district?.name,
          cognition: executionState.cognition,
          intent: executionState.intentClassification,
          vendors,
          products,
          services,
          hospitals,
          doctors,
          transportResults,
          districtIntelligence: executionState.districtIntelligence,
          hasLiveAvailability: false
        })) as any;
        return executionState.response;
      },
      executionState
    );

    return finalizeCognitionResponse(res, executionState);
  } catch (error) {
    throw error;
  }
}