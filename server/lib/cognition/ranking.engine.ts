// Cognition Ranking Engine
// BharatOS Phase 4 - Relevance & Trust Ranking

export const ENGINE_VERSION = "1.0.0";

// Import canonical CognitionResult from single source of truth
import type { CognitionResult } from './types';
export type { CognitionResult };

import { findFuzzyMatches, getUnifiedGroundingIndex, getTransliterations } from '../../services/district-memory.service';

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

// Query stop words (geographic and prepositional filler that should not match business titles)
const QUERY_STOP_WORDS = new Set([
  'in', 'at', 'near', 'me', 'mein', 'ko', 'ke', 'ki', 'ka', 'se', 'par',
  'shahdol', 'शाहडोल', 'bazaar', 'market'
]);

// Generic taxonomy terms that should not score points unless explicitly requested by the user
const GENERIC_CATEGORY_TERMS = new Set(['service', 'services', 'सेवा', 'shop', 'store', 'दुकान']);

export function calculateRelevanceScore(
  entity: DiscoveryEntity,
  searchTerms: string[],
  cognition: any,
  intentClassification?: IntentClassification
): RankedEntity {
  const searchableTerms = getUnifiedGroundingIndex(entity);
  const matchReasons: string[] = [];
  const rawQuery = (cognition?.normalized || '').toLowerCase();

  // 1. Text Relevance (0-40 points)
  let textRelevance = 0;
  const titleLower = entity.title?.toLowerCase() || '';
  const subtitleLower = entity.subtitle?.toLowerCase() || '';
  const categoryLower = entity.category?.toLowerCase() || '';

  for (const term of searchTerms) {
    const termLower = term.toLowerCase().trim();
    if (!termLower) continue;

    // Skip location stop words (e.g. "in shahdol" should not match every entity with "Shahdol" in title)
    if (QUERY_STOP_WORDS.has(termLower)) continue;

    // For generic terms like "service", only match if the user's actual query included that term
    const isGeneric = GENERIC_CATEGORY_TERMS.has(termLower);
    if (isGeneric && !rawQuery.includes(termLower)) continue;

    let termMatched = false;

    // Transliteration expansion (Devanagari <-> Latin)
    const variants = [termLower, ...getTransliterations(termLower).map(t => t.toLowerCase())];

    // Exact or transliterated title match = highest
    for (const v of variants) {
      if (titleLower.includes(v)) {
        textRelevance += 15;
        matchReasons.push(v === termLower ? `title:${term}` : `title:${term}->${v}`);
        termMatched = true;
        break;
      }
    }

    // Category/subtitle match = medium
    if (!termMatched) {
      for (const v of variants) {
        if (subtitleLower.includes(v) || categoryLower.includes(v)) {
          textRelevance += 10;
          matchReasons.push(v === termLower ? `category:${term}` : `category:${term}->${v}`);
          termMatched = true;
          break;
        }
      }
    }

    // Unified index match = low but broad
    if (!termMatched) {
      for (const v of variants) {
        if (searchableTerms.some(st => st.includes(v))) {
          textRelevance += 5;
          matchReasons.push(v === termLower ? `semantic:${term}` : `semantic:${term}->${v}`);
          termMatched = true;
          break;
        }
      }
    }

    // Fuzzy matching for typos and phonetic similarity
    if (!termMatched) {
      const fuzzyMatches = findFuzzyMatches(termLower, searchableTerms);
      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        const fuzzyScore = Math.floor(bestMatch.score * 10);
        textRelevance += fuzzyScore;
        matchReasons.push(`fuzzy:${term}~${bestMatch.matchedTerm}(${Math.round(bestMatch.score * 100)}%)`);
      }
    }
  }

  // Multi-token title coverage bonus (boost exact person/business name matches)
  const queryTokens = rawQuery.split(/\s+/).filter((t: string) => t.length > 2 && !QUERY_STOP_WORDS.has(t));
  if (queryTokens.length > 1) {
    let matchedTokenCount = 0;
    for (const qTok of queryTokens) {
      const tokVariants = [qTok, ...getTransliterations(qTok).map(t => t.toLowerCase())];
      if (tokVariants.some(v => titleLower.includes(v))) {
        matchedTokenCount++;
      }
    }
    if (matchedTokenCount >= 2) {
      const coverageRatio = matchedTokenCount / queryTokens.length;
      const coverageBonus = Math.round(coverageRatio * 20); // up to 20 bonus points
      textRelevance += coverageBonus;
      matchReasons.push(`multi_token_title_match:${matchedTokenCount}/${queryTokens.length}(+${coverageBonus})`);
    }
  }

  // 2. Domain Match (0-25 points)
  let domainMatch = 0;
  if (cognition.domain === entity.entityType ||
    (cognition.domain === 'SERVICES' && entity.entityType === 'SERVICE') ||
    (cognition.domain === 'SERVICE' && entity.entityType === 'SERVICE') ||
    (cognition.domain === 'HEALTHCARE' && ['HOSPITAL', 'DOCTOR'].includes(entity.entityType)) ||
    (cognition.domain === 'TRANSPORT' && entity.entityType === 'BUS') ||
    (cognition.domain === 'EDUCATION' && entity.entityType === 'SCHOOL')) {
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
    const sLower = term.toLowerCase().trim();
    if (QUERY_STOP_WORDS.has(sLower)) continue;
    if (GENERIC_CATEGORY_TERMS.has(sLower) && !rawQuery.includes(sLower)) continue;
    if (searchableTerms.some(st => st.includes(sLower))) {
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

  // Critical Relevance Gate:
  // Text relevance must be >= 10. Domain match, trust, and popularity
  // can augment a relevant candidate, but can NEVER fabricate relevance
  // for an entity that has no textual or semantic match to the user query.
  const isRelevant = textRelevance >= 10;
  const relevanceScore = isRelevant
    ? textRelevance + domainMatch + trustScore + semanticMatch + popularity + intentBonus
    : 0;

  const confidenceScore = isRelevant ? Math.min(relevanceScore / 100, 1) : 0;

  return {
    ...entity,
    relevanceScore,
    matchReasons: isRelevant ? matchReasons : [],
    confidenceScore,
    rankingFactors: {
      textRelevance,
      domainMatch,
      trustScore: isRelevant ? trustScore : 0,
      semanticMatch: isRelevant ? semanticMatch : 0,
      popularity: isRelevant ? popularity : 0
    }
  };
}
