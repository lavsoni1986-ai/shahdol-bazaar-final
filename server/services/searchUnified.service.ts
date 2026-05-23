/**
 * Search Service — Unified Entry Point (NEW)
 * 
 * Architecture: One Brain, One Flow
 * This is the NEW canonical search entry point.
 * Existing search.service.ts remains untouched.
 */

import { mapCategory, extractIntentKeywords, CATEGORY_MAP } from "../utils/categoryMapper";
import { findVendorsByCategory, findVendorsByIds } from "../repositories/vendor.repo";
import { findProductsByCategory } from "../repositories/product.repo";
import { getBatchTrustScores } from "./dssl.service";
import { parseIntent } from "./intent.service";
import { parseIntentAI } from "./intent-ai.service";
import { generateReason } from "./ai-refine.service";
import { mapVendorByType } from "../dto/entity.dto";
import { FEATURES } from "../config/featureFlags";
import { aiProviderManager } from "../ai/provider-manager";
import { districtMemory } from "./district-memory.service";
import { dynamicDiscoveryRanking } from "./dynamic-discovery-ranking.service";
import { expandSearchTerms, ALIAS_TO_CANONICAL } from "../../shared/cognition/search-taxonomy";

import { resolveQuery, ResolverResult, assertCanonicalResult } from "../../shared/contracts/ontology/index";
import type { AISearchResultContract } from '../../shared/contracts/entity.contract';
// ============================================
// DEBUG PANEL FOR RETRIEVAL ANALYSIS
// ============================================
function logRetrievalDebug(params: {
  query: string;
  expansion: any;
  intent: any;
  results: { vendors: number; products: number };
  category?: string;
  districtId: number;
}): void {
  console.log(`🔍 [RETRIEVAL DEBUG] Query: "${params.query}"`);
  console.log(`   📊 Expansion: ${params.expansion.expanded.join(', ')} (confidence: ${(params.expansion.confidence * 100).toFixed(1)}%)`);
  console.log(`   🎯 Intent: ${params.intent.mainCategory} | Keywords: ${params.intent.keywords.join(', ')}`);
  console.log(`   📍 District: ${params.districtId} | Category: ${params.category || 'N/A'}`);
  console.log(`   📈 Results: ${params.results.vendors} vendors, ${params.results.products} products`);

  if (params.results.vendors === 0 && params.results.products === 0) {
    console.log(`   ⚠️  NO RESULTS - Demand signal recorded`);
  }
}

// ============================================
// TYPES
// ============================================

interface SearchResult {
  vendors: VendorResult[];
  products: ProductResult[];
  busRoutes: BusRoute[];
}

interface VendorResult {
  id: number;
  name: string;
  slug: string;
  category: string;
  districtId: number;
  trustScore: number;
  dsslScore?: number;
  finalScore?: number;
  rating?: number | null;
  avgRating?: number | null;
  isVerified?: boolean;
  description?: string | null;
  logo?: string | null;
}

interface ProductResult {
  id: number;
  name: string;
  description: string | null;
  price: number;
  mrp: number | null;
  unit: string | null;
  imageUrl: string | null;
  inStock: boolean;
  discount: number | null;
  soldCount: number;
  rating: number | null;
}

interface BusRoute {
  id: number;
  fromCity: string;
  toCity: string;
  time: string;
  price: number;
  type: string;
  routeDescription: string;
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export async function searchUnified(query: string, districtId: number): Promise<{
  intent: string | null;
  canonicalSemantics: ResolverResult;
  results: SearchResult;
  meta: { count: number; district: number; error?: string; rankingIntelligence?: any; searchExpansion?: any };
}> {
  let intent: any = null;
  let searchExpansion: any = null;
  let canonicalSemantics: ResolverResult;
  try {
    // 1. Detect intent with taxonomy expansion
    intent = detectIntent(query);

    // 2. Resolve to canonical ontology
    canonicalSemantics = resolveQuery({ text: query });
    assertCanonicalResult(canonicalSemantics); // Runtime assertion

    // Log search expansion for debugging
    searchExpansion = {
      original: query,
      corrected: intent.correctedQuery !== query ? intent.correctedQuery : undefined,
      expandedTerms: intent.expandedTerms,
      confidence: intent.confidence,
      canonicalCategories: intent.mainCategory
    };



    // legacy rule intent enrichment
    const parsedIntent = parseIntent(query);
    if (parsedIntent?.category) {
      intent.mainCategory = parsedIntent.category || intent.mainCategory;
    }

    // guarded AI intent enrichment (uses cognitive routing)
    if (query.length > 5) {
      try {
        const aiIntent: any = await Promise.race([
          parseIntentAI(query),
          new Promise((_, reject) => setTimeout(() => reject("timeout"), 1200))
        ]);

        if (aiIntent?.category) {
          intent.mainCategory = aiIntent.category || intent.mainCategory;
        }
      } catch {
        // AI intent enrichment failed, continue with keyword matching
      }
    }

    // 3. Try semantic search first using expanded terms
    let vendors: any[] = [];
    let products: any[] = [];
    const category = canonicalSemantics.category;

    if (intent.expandedTerms.length > 0 && intent.confidence > 0.5) {
      // Use semantic search with taxonomy expansion
      ({ vendors, products } = await semanticSearch(intent.expandedTerms, districtId));
    }

    // 3. Fallback to category-based search if semantic search found nothing
    if (vendors.length === 0 && products.length === 0) {
      if (category) {
        ({ vendors, products } = await fetchData(category, districtId));
      }
    }

    // 4. Normalize all vendor results to canonical DTO shape before ranking and enrichment
    if (vendors.length > 0) {
      vendors = await Promise.all(vendors.map((vendor) => mapVendorByType(vendor)));
    }

    // Debug panel logging
    logRetrievalDebug({
      query,
      expansion: { expanded: intent.expandedTerms, confidence: intent.confidence },
      intent,
      results: { vendors: vendors.length, products: products.length },
      category: intent.mainCategory,
      districtId
    });

    // 4. Rank vendors with dynamic discovery intelligence
    const ranked = await rankVendors(vendors, districtId, query);

    // 5. DSSL ADVISORY ONLY (non-blocking)
    const ids = ranked.map(v => v.id);
    let trustSignals: Record<number, any> = {};

    try {
      trustSignals = await getBatchTrustScores(ids, districtId);
    } catch {
      // DSSL down = continue without signals
      trustSignals = {};
    }

    // 6. Enrich with trust signals
    let enriched = ranked.map(v => ({
      ...v,
      trustSignal: trustSignals[v.id] || null
    }));

    if (FEATURES.SEARCH_AI_REASON) {
      enriched = await Promise.all(
        enriched.map(async (v, i) => {
          if (i >= 5) return v;
          try {
            // Use cognitive routing for AI-powered reasoning
            const reason = await generateReason(query, v);
            return { ...v, reason };
          } catch {
            return v;
          }
        })
      );
    }

    // Derive canonical vendor entities by mapping and merging enrichment
    const canonicalVendors = await Promise.all(enriched.map(async (vendor) => ({
      ...(await mapVendorByType(vendor)),
      ...vendor
    })));

    // Map canonical vendors to AISearchResultContract for explainable search outputs
    // Import canonical contract types from shared
    // (mapping preserves existing enrichment fields like finalScore/trustSignal into explainability primitives)
    const toAISearchResult = (v: any) => {
      return {
        id: String(v.id || v.canonicalId || ''),
        canonicalId: v.canonicalId || (v.slug ? `vendor:${v.slug}` : undefined),
        title: v.title || v.name || v.title,
        snippet: v.description || v.snippet || undefined,
        source: 'marketplace',
        score: v.finalScore ?? v.score ?? undefined,
        trustLabel: v.trustLabel ?? undefined,
        groundingConfidence: typeof v.finalScore === 'number' ? Math.min(1, Math.max(0, (v.finalScore as number) / 100)) : undefined,
        trustSignals: v.trustSignal ? [v.trustSignal] : v.trustSignals ?? undefined,
        reasoningTrace: v.reason ? [v.reason] : undefined,
        processingSteps: v.processingSteps ?? undefined,
        performanceMetrics: v.performanceMetrics ?? undefined,
        entityLineage: v.meta?.legacy && v.meta.legacy.dsslScore ? [`dssl:${v.meta.legacy.dsslScore}`] : undefined
      };
    };

    const aiSearchVendors = canonicalVendors.map(toAISearchResult);


    // 7. Record search in district memory and get intelligence (async, don't block response)
    let districtInsights = null;
    try {
      // Get district intelligence for enhanced ranking
      districtInsights = await districtMemory.getDistrictIntelligence(districtId);
    } catch (err) {
      console.warn('District intelligence unavailable:', err);
    }

    // Record search demand with canonical ontology semantics
    districtMemory.recordDemand({
      districtId,
      query,
      domain: canonicalSemantics.domain,
      entity: canonicalSemantics.entity,
      category: canonicalSemantics.category,
      intent: canonicalSemantics.intent,
      signals: [...canonicalSemantics.operationalSignals, ...canonicalSemantics.userIntentSignals],
      confidence: intent.confidence,
      matchedEntities: enriched.length
    }).catch(err => console.warn('District memory recording failed:', err));

    // 8. Build response with district intelligence
    const response = {
      intent: intent.mainCategory,
      canonicalSemantics,
      results: {
        vendors: canonicalVendors as any,
        products: products as any,
        busRoutes: []
      },
      meta: {
        count: enriched.length,
        district: districtId,
        searchExpansion
      }
    };

    // Add district insights if available
    if (districtInsights) {
      (response as any).districtInsights = {
        economicHealth: districtInsights.economicHealth,
        relevantTrends: districtInsights.trendingQueries
          .filter((t: any) => t.category === canonicalSemantics.category)
          .slice(0, 3),
        supplyGaps: districtInsights.supplyGaps
          .filter((g: any) => g.domain === canonicalSemantics.domain)
          .slice(0, 2)
      };
    }

    return response;
  } catch (error) {
    console.error("searchUnified error:", error);
    const message = error instanceof Error ? error.message : String(error);

    return {
      intent: intent?.mainCategory || null,
      canonicalSemantics: canonicalSemantics || {} as ResolverResult, // fallback
      results: {
        vendors: [],
        products: [],
        busRoutes: []
      },
      meta: {
        count: 0,
        district: districtId,
        error: message,
        searchExpansion
      }
    };
  }
}

// ============================================
// INTERNAL: Intent Detection
// ============================================

// Typo tolerance mapping for common misspellings
const TYPO_CORRECTIONS: Record<string, string> = {
  'hospita': 'hospital',
  'hosptal': 'hospital',
  'hosital': 'hospital',
  'docter': 'doctor',
  'doctr': 'doctor',
  'phisician': 'physician',
  'medicne': 'medicine',
  'medcine': 'medicine',
  'electritian': 'electrician',
  'electician': 'electrician',
  'plumbr': 'plumber',
  'pluber': 'plumber',
  'carpnter': 'carpenter',
  'carpentr': 'carpenter',
  'resturant': 'restaurant',
  'restaraunt': 'restaurant',
  'grosery': 'grocery',
  'grocerry': 'grocery',
  'pharacy': 'pharmacy',
  'farmacy': 'pharmacy',
  'mechanic': 'mechanic',
  'mechnic': 'mechanic',
  'taxi': 'taxi',
  'taxy': 'taxi'
};

// Simple Levenshtein distance for typo detection
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Apply typo correction to query
function applyTypoCorrection(query: string): string {
  const words = query.toLowerCase().trim().split(/\s+/);
  const correctedWords = words.map(word => {
    // Exact match in typo corrections
    if (TYPO_CORRECTIONS[word]) {
      return TYPO_CORRECTIONS[word];
    }

    // Fuzzy match for words with small edit distance
    for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
      if (levenshteinDistance(word, typo) <= 1 && Math.abs(word.length - typo.length) <= 1) {
        return correction;
      }
    }

    return word;
  });

  return correctedWords.join(' ');
}

function detectIntent(query: string): { mainCategory: string; keywords: string[]; expandedTerms: string[]; confidence: number; correctedQuery: string } {
  // Apply typo correction first
  const correctedQuery = applyTypoCorrection(query);

  const keywords = extractIntentKeywords(correctedQuery);

  // Use cognition taxonomy for semantic expansion
  const expansion = expandSearchTerms(correctedQuery);

  // Determine main category from canonical matches
  let mainCategory = 'general';
  if (expansion.canonical.length > 0) {
    // Use the first canonical category found
    mainCategory = expansion.canonical[0];
  } else {
    // Fallback to legacy logic for queries not in taxonomy
    const lower = query.toLowerCase().trim();

    // Priority order matters: more specific first
    if (matchesAny(lower, ['doctor', 'hospital', 'clinic', 'medical', 'health', 'medicine', 'dental', 'dentist'])) {
      mainCategory = 'hospital';
    } else if (matchesAny(lower, ['kirana', 'grocery', 'supermarket', 'market', 'fresh vegetables', 'dudha', 'milk'])) {
      mainCategory = 'grocery';
    } else if (matchesAny(lower, ['bus', 'travel', 'transport', 'taxi', 'auto', 'rewa', 'jabalpur', 'route'])) {
      mainCategory = 'bus';
    } else if (matchesAny(lower, ['plumber', 'electrician', 'carpenter', 'repair', 'cleaning', 'mobile repair', 'ac'])) {
      mainCategory = 'service';
    } else if (matchesAny(lower, ['biryani', 'restaurant', 'food', 'pizza', 'burger', 'eat', 'meal', 'khana'])) {
      mainCategory = 'food';
    } else if (matchesAny(lower, ['school', 'education', 'coaching', 'college', 'learning'])) {
      mainCategory = 'education';
    } else if (matchesAny(lower, ['pharmacy', 'chemist', 'medicine shop'])) {
      mainCategory = 'pharmacy';
    } else if (matchesAny(lower, ['jewellers', 'gold', 'silver', 'ornament', 'anshu'])) {
      mainCategory = 'retail';
    } else if (matchesAny(lower, ['electronics', 'mobile', 'tv', 'fridge', 'ac', 'appliances'])) {
      mainCategory = 'electronics';
    }
  }

  return {
    mainCategory,
    keywords,
    expandedTerms: expansion.expanded,
    confidence: expansion.confidence,
    correctedQuery
  };
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

// ============================================
// INTERNAL: Data Fetcher
// ============================================

async function fetchData(category: string, districtId: number): Promise<{
  vendors: any[];
  products: any[];
}> {
  // Parallel fetch
  const [vendors, products] = await Promise.all([
    findVendorsByCategory(category, districtId),
    findProductsByCategory(category, districtId)
  ]);

  return { vendors, products };
}

// ============================================
// SEMANTIC SEARCH WITH TAXONOMY EXPANSION
// ============================================
async function semanticSearch(expandedTerms: string[], districtId: number): Promise<{
  vendors: any[];
  products: any[];
}> {
  const { prisma } = await import('../storage.js');

  // Use taxonomy mapping to find canonical categories, then search by those categories
  // Map taxonomy categories to actual VendorCategory enum values
  // NOTE: electronics split migration (electronics.store vs electronics.repair)
  const categoryMapping: Record<string, string> = {
    'healthcare': 'HOSPITAL',
    'hospital': 'HOSPITAL',
    'pharmacy': 'PHARMACY',
    'electrician': 'SERVICE',
    // legacy 'electronics' mapping retained for compatibility (will be resolved by resolver below)
    'electronics': 'SERVICE',
    'electronics.store': 'COMMERCE',
    'electronics.repair': 'SERVICE',
    'carpenter': 'SERVICE',
    'mechanic': 'SERVICE',
    'restaurant': 'SERVICE',
    'grocery': 'GROCERY',
    'school': 'EDUCATION',
    'taxi': 'TRANSPORT',
    'laundry': 'SERVICE'
  };

  const canonicalCategories = new Set<string>();

  // Resolve expanded taxonomy terms to vendor categories, with compatibility resolver for 'electronics'
  for (const term of expandedTerms) {
    const taxonomyCategory = ALIAS_TO_CANONICAL[term.toLowerCase()];
    if (taxonomyCategory) {
      // Compatibility resolution for ambiguous 'electronics' token
      let resolvedTaxonomyCategory = taxonomyCategory;
      if (taxonomyCategory.toLowerCase() === 'electronics') {
        // Heuristic: detect repair-oriented tokens in expandedTerms or original term
        const repairTokens = ['repair', 'fix', 'broken', 'service center', 'repair shop', 'screen', 'battery', 'replacement'];
        const lowerQuery = expandedTerms.join(' ').toLowerCase();
        const isRepair = repairTokens.some(rt => lowerQuery.includes(rt) || term.toLowerCase().includes(rt));
        if (isRepair) {
          resolvedTaxonomyCategory = 'electronics.repair';
        } else {
          resolvedTaxonomyCategory = 'electronics.store';
        }
      }

      const mappedCategory = categoryMapping[resolvedTaxonomyCategory.toLowerCase()];
      if (mappedCategory) {
        canonicalCategories.add(mappedCategory);
      }
    }
  }

  // Convert to array
  const categoriesToSearch = Array.from(canonicalCategories);

  // Search vendors by category (taxonomy-powered)
  let vendors: any[] = [];
  if (categoriesToSearch.length > 0) {
    vendors = await prisma.vendor.findMany({
      where: {
        districtId,
        category: {
          in: categoriesToSearch as any
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        districtId: true,
        logo: true,
        rating: true,
        dsslScore: true,
        isVerified: true,
        boostedUntil: true,
        description: true
      },
      take: 50
    });
  }

  // Search products by category
  const products = await prisma.product.findMany({
    where: {
      categoryName: {
        in: categoriesToSearch
      }
    },
    select: {
      id: true,
      title: true,
      description: true,
      categoryName: true,
      price: true,
      images: true,
      vendorId: true
    },
    take: 50
  });

  return { vendors, products };
}

// ============================================
// RANK VENDORS WITH DYNAMIC DISCOVERY INTELLIGENCE
// ============================================
async function rankVendors(vendors: any[], districtId: number, query: string): Promise<VendorResult[]> {
  // Use the dynamic discovery ranking engine
  const rankingContext = {
    query,
    districtId,
    entityType: 'vendor' as const,
    category: 'general' // Would be extracted from query analysis
  };

  const rankings = await dynamicDiscoveryRanking.rankEntities(vendors, rankingContext);

  // Convert back to VendorResult format for compatibility
  return rankings.map(ranking => {
    const vendor = vendors.find(v => v.id === ranking.entityId);
    if (!vendor) return null;

    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      category: vendor.category,
      districtId: vendor.districtId,
      trustScore: vendor.trustScore ?? vendor.dsslScore ?? 0,
      dsslScore: vendor.dsslScore,
      rating: vendor.rating,
      avgRating: vendor.avgRating,
      isVerified: vendor.isVerified,
      description: vendor.description,
      logo: vendor.logo,
      // Enhanced with dynamic ranking intelligence
      finalScore: ranking.finalScore,
      rank: ranking.rank,
      insights: ranking.insights
    };
  }).filter(Boolean).sort((a, b) => b.finalScore - a.finalScore);
}
