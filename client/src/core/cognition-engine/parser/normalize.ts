/**
 * QUERY NORMALIZATION UTILITIES
 * BharatOS Phase 3 - Cognition Extraction Foundation
 *
 * Extracted from: ai.routes.ts, ai/concierge.routes.ts, cognitive.query.engine.ts
 */

export interface NormalizedQuery {
  original: string;
  normalized: string;
  cleaned: string;
}

/**
 * Canonical query normalization for BharatOS
 * Handles: trimming, lowercasing, basic cleanup
 */
export function normalizeQuery(query: string): NormalizedQuery {
  if (!query || typeof query !== "string") {
    return {
      original: query || "",
      normalized: "",
      cleaned: ""
    };
  }

  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  const cleaned = normalized.replace(/\s+/g, ' '); // normalize whitespace

  return {
    original: query,
    normalized,
    cleaned
  };
}

/**
 * Legacy compatibility function
 * Matches existing route behavior exactly
 */
export function normalizeQueryLegacy(query: string): string {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return "";
  }

  return query.trim().toLowerCase();
}