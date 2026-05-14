import { Request, Response } from "express";
import { prisma } from "../../storage";
import { normalizeQueryLegacy } from "../../lib/cognition/normalize";
import { cognitiveParseQuery } from "../../services/cognitive.query.engine";
import { districtMemory } from "../../services/district-memory.service";
import { getUnifiedDiscoveryFeed } from "../../services/discovery.service";
import { trustIntegrityEngine } from "../../services/district-memory.service";
import { bharatOSLogger, LogComponent } from "../../lib/logging/structured-logger";
import { safeExecute } from "../../lib/runtime/safe-execute";
import { updateSharedLearning } from "../../services/district-intelligence.service";
import { groundTransportUtility, shouldGroundTransport } from "../../lib/grounding/transport-adapter";
import {
  CognitionExecutionState,
  createExecutionState,
  CognitionStage,
  advanceStage,
  executeEngine,
  classifyQueryIntent,
  groundQuery,
  calculateRelevanceScore,
  validateSemanticRelevance,
  calculateConfidence, calculateConfidenceV2, buildConfidenceResult,
  createTelemetryTruth,
  emitTelemetry,
  synthesizeResponse,
  finalizeCognitionResponse
} from '../../lib/cognition';

/**
 * Success Orchestrator: Handles normal cognition flow when entities are found
 */
export async function handleSuccessFlow({
  req,
  res,
  rawQuery,
  districtId,
  district,
  executionState
}: {
  req: Request;
  res: Response;
  rawQuery: string;
  districtId: number;
  district: any;
  executionState: CognitionExecutionState;
}) {
  try {
    advanceStage(executionState, CognitionStage.NORMALIZATION);

    // Parse cognition
    executionState.cognition = cognitiveParseQuery(rawQuery) as any;
    if (!executionState.cognition) {
      throw new Error('Unable to parse cognition');
    }
    const cognition = executionState.cognition;

    // Intent parsing
    await executeEngine(
      {
        stage: CognitionStage.INTENT_PARSING,
        engineName: 'intent',
        timeoutMs: 2000
      },
      async () => {
        executionState.intentClassification = classifyQueryIntent(rawQuery, cognition);
        executionState.normalizedIntent = executionState.intentClassification.primaryIntent;
        return executionState.intentClassification;
      },
      executionState
    );

    // Domain classification
    await executeEngine(
      {
        stage: CognitionStage.DOMAIN_CLASSIFICATION,
        engineName: 'domain-classification',
        timeoutMs: 1000
      },
      async () => {
        cognition.domain =
          executionState.intentClassification?.domain ||
          cognition?.domain ||
          'GENERAL';
        return cognition.domain;
      },
      executionState
    );

    // District intelligence
    try {
      executionState.districtIntelligence = await districtMemory.getDistrictIntelligence(districtId);
    } catch (error) {
      console.warn('District memory unavailable:', error);
      executionState.districtIntelligence = null;
    }

    // Grounding
    const groundingResult = await executeEngine(
      {
        stage: CognitionStage.GROUNDING,
        engineName: 'grounding',
        timeoutMs: 3000
      },
      async () => groundQuery({
        query: rawQuery,
        districtId,
        cognition: cognition
      }),
      executionState
    );

    const searchTerms = groundingResult.searchTerms;
    const domainFilteredEntities = groundingResult.domainFilteredEntities;

    // Enhance search terms with district memory
    if (executionState.districtIntelligence?.trendingQueries?.length) {
      const relevantTrends = executionState.districtIntelligence.trendingQueries
        .filter(t => t.category === cognition.domain || t.intent === cognition.intent)
        .slice(0, 3);

      for (const trend of relevantTrends) {
        if (!searchTerms.includes(trend.query)) {
          searchTerms.push(trend.query);
        }
      }
    }

    // Get unified discovery feed
    let allEntities = [];
    try {
      allEntities = await getUnifiedDiscoveryFeed(districtId);
    } catch (error) {
      console.error('Discovery feed failed:', error);
      allEntities = [];
    }

    // Relevance ranking
    const rankedEntities = await executeEngine(
      {
        stage: CognitionStage.RANKING,
        engineName: 'ranking',
        timeoutMs: 2000
      },
      async () => domainFilteredEntities.map(entity =>
        calculateRelevanceScore(entity, searchTerms, cognition, executionState.intentClassification)
      ),
      executionState
    );

    // Validation
    const validationResult = await executeEngine(
      {
        stage: CognitionStage.VALIDATION,
        engineName: 'validation',
        timeoutMs: 1000
      },
      async () => {
        return validateSemanticRelevance(
          cognition,
          rankedEntities,
          0.5
        );
      },
      executionState
    );
    executionState.semanticValidation = validationResult;

    // Sort and filter entities
    rankedEntities.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const relevantEntities = rankedEntities.filter(entity => entity.relevanceScore >= 10);

    // Apply trust integrity adjustments
    const integrityAdjustedEntities = relevantEntities.map(entity => {
      try {
        return {
          ...entity,
          relevanceScore: trustIntegrityEngine.applyIntegrityAdjustments(
            entity.sourceId || 0,
            entity.relevanceScore
          )
        };
      } catch (error) {
        executionState.operationErrors.push(`trust_integrity: ${error.message}`);
        return entity;
      }
    });

    bharatOSLogger.info(LogComponent.RANKING, 'relevance_ranking_applied', 'Applied relevance ranking', {
      totalEntities: domainFilteredEntities.length,
      rankedEntities: rankedEntities.length,
      relevantEntities: relevantEntities.length,
      integrityAdjustedEntities: integrityAdjustedEntities.length,
      topScore: rankedEntities[0]?.relevanceScore || 0
    });

    executionState.allResults = integrityAdjustedEntities;

    // Separate by entity type
    const vendors = integrityAdjustedEntities
      .filter(e => e.entityType === 'SHOP')
      .slice(0, 5);

    let products = integrityAdjustedEntities
      .filter(e => e.entityType === 'PRODUCT')
      .slice(0, 5);

    const hospitals = integrityAdjustedEntities
      .filter(e => e.entityType === 'HOSPITAL')
      .slice(0, 4);

    const doctors = integrityAdjustedEntities
      .filter(e => e.entityType === 'DOCTOR')
      .slice(0, 5);

    // Get services
    const services = await prisma.serviceWorker.findMany({
      where: {
        districtId,
        isActive: true,
        OR: searchTerms.map(term => ({
          name: { contains: term, mode: "insensitive" },
          serviceType: { contains: term, mode: "insensitive" }
        }))
      },
      take: 3
    });

    // Shared learning
    await safeExecute('shared_learning', async () => {
      const signal = {
        districtId,
        areaKey: district?.slug || "unknown",
        domain: cognition.domain || "GENERAL",
        searchTerms,
        vendorIds: vendors.map(v => v.sourceId),
        productIds: products.map(v => v.sourceId),
        serviceIds: services.map(s => s.id),
        hospitalIds: hospitals.map(h => h.sourceId),
        successScore: executionState.confidenceResult?.score ?? cognition?.confidence ?? 0,
        responseMode: cognition.responseMode
      };

      await updateSharedLearning(signal);
    }, executionState.operationErrors);

    // Check transport utilities if no results
    let transportResults: any = null;
    if (!vendors.length && !products.length && !hospitals.length && !doctors.length && shouldGroundTransport(cognition)) {
      bharatOSLogger.info(LogComponent.GROUNDING, 'utility_transport_check', 'Checking transport utilities', {
        districtId,
        domain: cognition.domain,
        entity: cognition.entity,
        query: rawQuery
      });

      transportResults = await groundTransportUtility(rawQuery, districtId);
    }

    // Confidence calculation
    await executeEngine(
      {
        stage: CognitionStage.CONFIDENCE,
        engineName: 'confidence',
        timeoutMs: 1000
      },
      async () => {
        executionState.confidenceResult = (function(){
          const val = calculateConfidence({
            cognition: executionState.cognition as any,
            matchedEntities: executionState.allResults.length,
            totalEntities: executionState.allResults.length || 1,
            rankingFactors: null
          });
          // If calculateConfidence returns a number (legacy), wrap into ConfidenceResult shape
          if (typeof val === 'number') {
            return buildConfidenceResult(val);
          }
          return val || buildConfidenceResult(0);
        })();

        // Mirror confidence back to cognition for downstream compatibility
        try {
          if (executionState.cognition && executionState.confidenceResult) {
            (executionState.cognition as any).confidence = executionState.confidenceResult.score;
          }
        } catch (e) {
          // non-fatal
        }
        return executionState.confidenceResult;
      },
      executionState
    );

    // Telemetry creation
    await executeEngine(
      {
        stage: CognitionStage.TELEMETRY,
        engineName: 'telemetry',
        timeoutMs: 1000
      },
      async () => {
        executionState.telemetry = createTelemetryTruth({
          finalResults: executionState.allResults,
          hallucinationPrevented: false,
          query: rawQuery,
          unmetDemand: executionState.allResults.length === 0
        });
        return executionState.telemetry;
      },
      executionState
    );

    // Response synthesis
    await executeEngine(
      {
        stage: CognitionStage.RESPONSE_SYNTHESIS,
        engineName: 'response-synthesis',
        timeoutMs: 6000
      },
      async () => {
        executionState.response = await synthesizeResponse({
          query: rawQuery,
          districtName: district?.name,
          cognition: cognition,
          intent: executionState.intentClassification,
          vendors,
          products,
          services,
          hospitals,
          doctors,
          transportResults,
          districtIntelligence: executionState.districtIntelligence,
          hasLiveAvailability: false
        });
        return executionState.response;
      },
      executionState
    );

    return finalizeCognitionResponse(res, executionState);
  } catch (error) {
    throw error;
  }
}