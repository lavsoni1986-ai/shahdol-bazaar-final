// Cognition Confidence Engine
// BharatOS Phase 4 - Trust & Semantic Validation

export const ENGINE_VERSION = "1.0.0";

import { CognitionResult, RankedEntity } from './ranking.engine';

export interface ConfidenceContext {
  cognition: CognitionResult;
  matchedEntities: number;
  totalEntities: number;
  rankingFactors: any;
}

export interface SemanticValidationResult {
  isValid: boolean;
  reason: string;
  confidence: number;
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ConfidenceRationale {
  score: number;
  label: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[]; // Internal audit trail
}

export function calculateConfidence(context: ConfidenceContext): number {
  const { cognition, matchedEntities, totalEntities, rankingFactors } = context;

  // Base confidence from semantic parsing
  let confidence = (cognition?.confidence) ?? 0.5;

  // Adjust based on entity matching
  const matchRatio = matchedEntities / Math.max(totalEntities, 1);

  if (matchRatio > 0.8) {
    confidence += 0.2; // Strong entity coverage
  } else if (matchRatio > 0.5) {
    confidence += 0.1; // Moderate coverage
  } else if (matchRatio < 0.2) {
    confidence -= 0.2; // Poor coverage
  }

  // Adjust based on ranking quality
  if (rankingFactors) {
    const avgRankingScore = (
      (rankingFactors.textRelevance || 0) +
      (rankingFactors.domainMatch || 0) +
      (rankingFactors.trustScore || 0)
    ) / 3;

    if (avgRankingScore > 20) {
      confidence += 0.1;
    } else if (avgRankingScore < 10) {
      confidence -= 0.1;
    }
  }

  // Ensure confidence stays within bounds
  return Math.max(0, Math.min(1, confidence));
}

export function validateSemanticRelevance(
  cognition: CognitionResult,
  rankedEntities: RankedEntity[],
  confidence: number
): SemanticValidationResult {
  // Minimum confidence threshold
  const MIN_CONFIDENCE = 0.3;

  if (confidence < MIN_CONFIDENCE) {
    return {
      isValid: false,
      reason: `Confidence ${confidence.toFixed(2)} below minimum threshold ${MIN_CONFIDENCE}`,
      confidence,
      confidenceBand: 'LOW'
    };
  }

  // Check for hallucinated results (very low relevance scores)
  const lowRelevanceCount = rankedEntities.filter(e => e.relevanceScore < 5).length;
  const hallucinationRatio = lowRelevanceCount / Math.max(rankedEntities.length, 1);

  if (hallucinationRatio > 0.7) {
    return {
      isValid: false,
      reason: `High hallucination ratio ${(hallucinationRatio * 100).toFixed(0)}% - mostly irrelevant results`,
      confidence,
      confidenceBand: 'LOW'
    };
  }

  // Check domain-entity alignment
  if (cognition.domain && cognition.entity) {
    const domainMatches = rankedEntities.filter(e =>
      e.entityType === cognition.entity ||
      (cognition.domain === 'HEALTHCARE' && ['HOSPITAL', 'DOCTOR'].includes(e.entityType)) ||
      (cognition.domain === 'TRANSPORT' && e.entityType === 'BUS')
    ).length;

    if (domainMatches === 0) {
      return {
        isValid: false,
        reason: `No entities match domain-entity alignment: ${cognition.domain}/${cognition.entity}`,
        confidence,
        confidenceBand: 'LOW'
      };
    }
  }

  return {
    isValid: true,
    reason: 'Semantic relevance validated',
    confidence,
    confidenceBand: confidence > 0.7 ? 'HIGH' : confidence > 0.4 ? 'MEDIUM' : 'LOW'
  };
}

export function buildConfidenceResult(confidence: number): { score: number; label: 'HIGH' | 'MEDIUM' | 'LOW'; reasoning: string[] } {
  const reasoning: string[] = [];

  if (confidence > 0.7) {
    reasoning.push('High confidence from strong semantic matching');
  } else if (confidence > 0.4) {
    reasoning.push('Medium confidence from moderate matching');
  } else {
    reasoning.push('Low confidence - potential hallucination risk');
  }

  return {
    score: confidence,
    label: confidence > 0.7 ? 'HIGH' : confidence > 0.4 ? 'MEDIUM' : 'LOW',
    reasoning
  };
}

export const calculateConfidenceV2 = (context: any): ConfidenceRationale => {
  const reasons: string[] = [];
  let finalScore = 0.5;

  if (context?.isVerified) {
    finalScore += 0.2;
    reasons.push("verified_entity");
  }

  if (context?.hasActionableContact) {
    finalScore += 0.15;
    reasons.push("actionable_contact_present");
  }

  if (typeof context?.trustInheritance === "number" && context.trustInheritance > 0.8) {
    finalScore += 0.15;
    reasons.push("high_trust_inheritance");
  }

  finalScore = Math.max(0, Math.min(1, finalScore));

  return {
    score: finalScore,
    label: finalScore > 0.8 ? "HIGH" : finalScore > 0.5 ? "MEDIUM" : "LOW",
    reasons,
  };
};
