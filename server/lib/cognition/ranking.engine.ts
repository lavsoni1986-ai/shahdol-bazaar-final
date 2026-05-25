// Cognition Ranking Engine
// BharatOS Phase 4 - Relevance & Trust Ranking

export const ENGINE_VERSION = "1.0.0";

// Re-export for confidence.engine
export interface CognitionResult {
  query: string;
  domain: string;
  intent: string;
  confidence: number;
  entities: any[];
  [key: string]: any;
}

import { findFuzzyMatches, getUnifiedGroundingIndex } from '../../services/district-memory.service';

// Ranking interfaces
export interface DiscoveryEntity {
  id: number;
  title?: string;
  subtitle?: string;
  category?: string;
  entityType: string;
  dsslScore?: number;
  rankScore?: number;
  [key: string]: any;
}

export interface IntentClassification {
  primaryIntent: string;
  confidence: number;
  intentReasons: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  temporalContext: 'immediate' | 'scheduled' | 'general';
  geographicScope: 'nearby' | 'district' | 'broad';
}

export interface RankedEntity extends DiscoveryEntity {
  relevanceScore: number;
  matchReasons: string[];
  confidenceScore: number;
  rankingFactors: {
    textRelevance: number;
    domainMatch: number;
    trustScore: number;
    semanticMatch: number;
    popularity: number;
  };
}

// Query intent enum (should be moved to shared types)
export enum QueryIntent {
  DISCOVERY = 'DISCOVERY',
  TRANSACTIONAL = 'TRANSACTIONAL',
  EMERGENCY = 'EMERGENCY',
  NAVIGATIONAL = 'NAVIGATIONAL',
  INFORMATIONAL = 'INFORMATIONAL',
  COMPARATIVE = 'COMPARATIVE'
}

export function calculateRelevanceScore(
  entity: DiscoveryEntity,
  searchTerms: string[],
  cognition: any,
  intentClassification?: IntentClassification
): RankedEntity {
  const searchableTerms = getUnifiedGroundingIndex(entity);
  const matchReasons: string[] = [];

  // 1. Text Relevance (0-40 points)
  let textRelevance = 0;
  const titleLower = entity.title?.toLowerCase() || '';
  const subtitleLower = entity.subtitle?.toLowerCase() || '';
  const categoryLower = entity.category?.toLowerCase() || '';

  for (const term of searchTerms) {
    const termLower = term.toLowerCase();
    let termMatched = false;

    // Exact title match = highest
    if (titleLower.includes(termLower)) {
      textRelevance += 15;
      matchReasons.push(`title:${term}`);
      termMatched = true;
    }

    // Category/subtitle match = medium
    if (subtitleLower.includes(termLower) || categoryLower.includes(termLower)) {
      textRelevance += 10;
      matchReasons.push(`category:${term}`);
      termMatched = true;
    }

    // Unified index match = low but broad
    if (searchableTerms.some(st => st.includes(termLower))) {
      textRelevance += 5;
      matchReasons.push(`semantic:${term}`);
      termMatched = true;
    }

    // Fuzzy matching for typos and phonetic similarity
    if (!termMatched) {
      const fuzzyMatches = findFuzzyMatches(termLower, searchableTerms);
      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        // Add score based on fuzzy similarity (max 8 points for 0.8 score)
        const fuzzyScore = Math.floor(bestMatch.score * 10);
        textRelevance += fuzzyScore;
        matchReasons.push(`fuzzy:${term}~${bestMatch.matchedTerm}(${Math.round(bestMatch.score * 100)}%)`);
      }
    }
  }

  // 2. Domain Match (0-25 points)
  let domainMatch = 0;
  if (cognition.domain === entity.entityType ||
    (cognition.domain === 'HEALTHCARE' && ['HOSPITAL', 'DOCTOR'].includes(entity.entityType)) ||
    (cognition.domain === 'TRANSPORT' && entity.entityType === 'BUS')) {
    domainMatch = 25;
    matchReasons.push(`domain:${cognition.domain}`);
  }

  // 3. Trust Score (0-15 points)
  const rawTrust = (entity as any).trustScore ?? (entity as any).dsslScore ?? (entity as any).meta?.legacy?.dsslScore ?? 0;
  const trustScore = Math.min(rawTrust / 10, 15);
  if (rawTrust && rawTrust > 70) {
    matchReasons.push(`trust:${rawTrust}`);
  }

  // 4. Semantic Match (0-10 points)
  let semanticMatch = 0;
  const semanticTerms = cognition.searchTerms || [];
  for (const term of semanticTerms) {
    if (searchableTerms.some(st => st.includes(term.toLowerCase()))) {
      semanticMatch += 5;
      matchReasons.push(`semantic_term:${term}`);
    }
  }

  // 5. Popularity (0-10 points)
  const popularity = Math.min((entity.rankScore || 0) / 10, 10);
  if (entity.rankScore && entity.rankScore > 50) {
    matchReasons.push(`popular:${entity.rankScore}`);
  }

  // Intent-based bonuses
  let intentBonus = 0;
  if (intentClassification) {
    if (intentClassification.primaryIntent === QueryIntent.EMERGENCY && entity.entityType === 'HOSPITAL') {
      intentBonus = 30; // Prioritize hospitals for emergencies
      matchReasons.push('emergency_priority');
    } else if (intentClassification.primaryIntent === QueryIntent.TRANSACTIONAL && entity.entityType === 'SHOP') {
      intentBonus = 20; // Boost shops for transactional queries
      matchReasons.push('transactional_boost');
    } else if (intentClassification.primaryIntent === QueryIntent.NAVIGATIONAL && intentClassification.geographicScope === 'nearby') {
      intentBonus = 15; // Boost for navigational queries
      matchReasons.push('navigational_boost');
    } else if (intentClassification.primaryIntent === QueryIntent.COMPARATIVE && entity.entityType === 'SHOP') {
      intentBonus = 10; // Boost for comparative queries
      matchReasons.push('comparative_boost');
    }
  }

  // Calculate total relevance
  const relevanceScore = textRelevance + domainMatch + trustScore + semanticMatch + popularity + intentBonus;
  const confidenceScore = Math.min(relevanceScore / 100, 1); // Normalize to 0-1

  return {
    ...entity,
    relevanceScore,
    matchReasons,
    confidenceScore,
    rankingFactors: {
      textRelevance,
      domainMatch,
      trustScore,
      semanticMatch,
      popularity
    }
  };
}
