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
  businessType?: string;
  districtId: number;
  trustScore: number;
  dsslScore?: number;
  finalScore?: number;
  rating?: number | null;
  avgRating?: number | null;
  isVerified?: boolean;
  description?: string | null;
  logo?: string | null;
  rank?: number;
  insights?: string[];
}

interface ProductResult {
  id: number;
  name: string;
  title?: string;
  description: string | null;
  price: number;
  mrp: number | null;
  unit: string | null;
  imageUrl: string | null;
  images?: any[];
  inStock: boolean;
  discount: number | null;
  soldCount: number;
  rating: number | null;
  categoryName?: string | null;
  vendorId?: number;
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
  const trimmedQuery = typeof query === "string" ? query.trim() : "";
  if (!trimmedQuery) {
    return {
      intent: null,
      canonicalSemantics: {
        intent: 'DISCOVERY' as any,
        domain: 'SERVICES' as any,
        entity: 'PROVIDER' as any,
        category: 'GROCERY' as any,
        operationalSignals: [],
        userIntentSignals: []
      },
      results: {
        vendors: [],
        products: [],
        busRoutes: []
      },
      meta: {
        count: 0,
        district: districtId
      }
    };
  }

  let intent: any = null;
  let searchExpansion: any = null;
  let canonicalSemantics: ResolverResult = {
    intent: 'DISCOVERY' as any,
    domain: 'SERVICES' as any,
    entity: 'PROVIDER' as any,
    category: 'GROCERY' as any,
    operationalSignals: [],
    userIntentSignals: []
  };
  try {
    // 1. Detect intent with taxonomy expansion
    intent = detectIntent(trimmedQuery);

    // 2. Resolve to canonical ontology
    canonicalSemantics = resolveQuery({ text: trimmedQuery });
    assertCanonicalResult(canonicalSemantics); // Runtime assertion

    // Log search expansion for debugging
    searchExpansion = {
      original: trimmedQuery,
      corrected: intent.correctedQuery !== trimmedQuery ? intent.correctedQuery : undefined,
      expandedTerms: intent.expandedTerms,
      confidence: intent.confidence,
      canonicalCategories: intent.mainCategory
    };



    // legacy rule intent enrichment
    const parsedIntent = parseIntent(trimmedQuery);
    if (parsedIntent?.category) {
      intent.mainCategory = parsedIntent.category || intent.mainCategory;
    }

    // guarded AI intent enrichment (uses cognitive routing)
    if (trimmedQuery.length > 5) {
      try {
        const aiIntent: any = await Promise.race([
          parseIntentAI(trimmedQuery),
          new Promise((_, reject) => setTimeout(() => reject("timeout"), 1200))
        ]);

        if (aiIntent?.category) {
          intent.mainCategory = aiIntent.category || intent.mainCategory;
        }
      } catch {
        // AI intent enrichment failed, continue with keyword matching
      }
    }

    // 3. Unified search: taxonomy expansion + multi-field text search
    let vendors: any[] = [];
    let products: any[] = [];
    const category = canonicalSemantics.category;

    ({ vendors, products } = await semanticSearch(trimmedQuery, intent.expandedTerms, districtId, intent.mainCategory, intent.correctedQuery));

    // Fallback to category-based search only if unified search found nothing and intent was high-confidence
    if (vendors.length === 0 && products.length === 0) {
      if (category && intent.confidence > 0.5) {
        ({ vendors, products } = await fetchData(category, districtId));
      }
    }

    // 4. Normalize all vendor results to canonical DTO shape before ranking and enrichment
    if (vendors.length > 0) {
      vendors = await Promise.all(vendors.map(async (vendor) => {
        const mapped: any = await mapVendorByType(vendor);
        return {
          ...mapped,
          category: vendor.category || mapped.category || mapped.entityType || mapped.businessType || 'general'
        };
      }));
    }

    // Debug panel logging
    logRetrievalDebug({
      query: trimmedQuery,
      expansion: { expanded: intent.expandedTerms, confidence: intent.confidence },
      intent,
      results: { vendors: vendors.length, products: products.length },
      category: intent.mainCategory,
      districtId
    });

    // 4. Rank vendors with dynamic discovery intelligence
    const ranked = await rankVendors(vendors, districtId, trimmedQuery);

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
            const reason = await generateReason(trimmedQuery, {
              name: v.name,
              rating: v.rating ?? v.avgRating ?? 0,
              category: v.category,
              entityType: 'vendor' as any,
              dsslScore: v.dsslScore ?? v.trustScore ?? 0,
              trustScore: v.trustScore
            });
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
      query: trimmedQuery,
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
// SEMANTIC SEARCH WITH TAXONOMY EXPANSION & MULTI-FIELD MATCHING
// ============================================
async function semanticSearch(
  query: string,
  expandedTerms: string[],
  districtId: number,
  mainCategory?: string,
  correctedQuery?: string
): Promise<{
  vendors: any[];
  products: any[];
}> {
  const { prisma } = await import('../storage.js');

  // Map taxonomy categories to actual database category values
  // Notice 'hospital' & 'healthcare' map to both 'HOSPITAL' and 'HEALTHCARE'
  const categoryMapping: Record<string, string[]> = {
    'healthcare': ['HOSPITAL', 'HEALTHCARE'],
    'hospital': ['HOSPITAL', 'HEALTHCARE'],
    'pharmacy': ['PHARMACY'],
    'electrician': ['SERVICE'],
    'electronics': ['SERVICE', 'ELECTRONICS'],
    'electronics.store': ['COMMERCE', 'ELECTRONICS'],
    'electronics.repair': ['SERVICE', 'ELECTRONICS'],
    'carpenter': ['SERVICE'],
    'mechanic': ['SERVICE'],
    'restaurant': ['FOOD', 'RESTAURANT'],
    'food': ['FOOD', 'RESTAURANT'],
    'grocery': ['GROCERY'],
    'school': ['EDUCATION'],
    'taxi': ['TRANSPORT'],
    'laundry': ['SERVICE'],
    'retail': ['RETAIL', 'COMMERCE']
  };

  const canonicalCategories = new Set<string>();

  // Resolve expanded taxonomy terms to vendor categories
  for (const term of expandedTerms) {
    const taxonomyCategory = ALIAS_TO_CANONICAL[term.toLowerCase()];
    if (taxonomyCategory) {
      let resolvedTaxonomyCategory = taxonomyCategory;
      if (taxonomyCategory.toLowerCase() === 'electronics') {
        const repairTokens = ['repair', 'fix', 'broken', 'service center', 'repair shop', 'screen', 'battery', 'replacement'];
        const lowerQuery = (expandedTerms.join(' ') + ' ' + query).toLowerCase();
        const isRepair = repairTokens.some(rt => lowerQuery.includes(rt) || term.toLowerCase().includes(rt));
        if (isRepair) {
          resolvedTaxonomyCategory = 'electronics.repair';
        } else {
          resolvedTaxonomyCategory = 'electronics.store';
        }
      }

      const mappedCategories = categoryMapping[resolvedTaxonomyCategory.toLowerCase()];
      if (mappedCategories) {
        mappedCategories.forEach(c => canonicalCategories.add(c));
      }
    }
  }

  // Also include mainCategory mapping if recognized
  if (mainCategory) {
    const mainMapped = categoryMapping[mainCategory.toLowerCase()];
    if (mainMapped) {
      mainMapped.forEach(c => canonicalCategories.add(c));
    }
  }

  // Convert to array
  const categoriesToSearch = Array.from(canonicalCategories);

  const trimmed = (query || "").trim();
  const searchTerms: string[] = [];
  if (trimmed) {
    searchTerms.push(trimmed);
  }
  if (correctedQuery && correctedQuery.trim().toLowerCase() !== trimmed.toLowerCase()) {
    searchTerms.push(correctedQuery.trim());
  }

  // 1. Search Vendors (Taxonomy + Multi-Field Text Matching)
  let vendors: any[] = [];
  const vendorWhere: any = {
    districtId,
    status: "APPROVED",
    isShadowBanned: false
  };

  const vendorOrConditions: any[] = [];

  if (categoriesToSearch.length > 0) {
    vendorOrConditions.push({
      category: {
        in: categoriesToSearch as any
      }
    });
  }

  for (const term of searchTerms) {
    vendorOrConditions.push(
      { name: { contains: term, mode: "insensitive" } },
      { searchText: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { specialties: { has: term } }
    );
  }

  if (vendorOrConditions.length > 0) {
    vendorWhere.OR = vendorOrConditions;

    vendors = await prisma.vendor.findMany({
      where: vendorWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        businessType: true,
        districtId: true,
        logo: true,
        rating: true,
        dsslScore: true,
        isVerified: true,
        boostedUntil: true,
        description: true,
        specialties: true,
        searchText: true,
        createdAt: true,
        updatedAt: true
      },
      take: 50
    });
  }

  // 2. Search Products (Taxonomy + Title/Description Text Matching)
  let products: any[] = [];
  const productWhere: any = {
    districtId,
    approved: true,
    status: {
      in: ["APPROVED", "approved", "ACTIVE", "active"]
    },
    vendor: {
      districtId,
      status: "APPROVED",
      isShadowBanned: false
    }
  };

  const productOrConditions: any[] = [];

  if (categoriesToSearch.length > 0) {
    productOrConditions.push({
      categoryName: {
        in: categoriesToSearch
      }
    });
  }

  for (const term of searchTerms) {
    productOrConditions.push(
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } }
    );
  }

  if (productOrConditions.length > 0) {
    productWhere.OR = productOrConditions;

    const rawProducts = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        title: true,
        description: true,
        categoryName: true,
        price: true,
        imageUrl: true,
        images: true,
        vendorId: true
      },
      take: 50
    });

    products = rawProducts.map((p: any) => ({
      id: p.id,
      name: p.title,
      title: p.title,
      description: p.description,
      price: p.price ?? 0,
      mrp: null,
      unit: null,
      imageUrl: p.imageUrl || (p.images && p.images.length > 0 ? (p.images[0].imageUrl || p.images[0].url) : null),
      images: p.images || [],
      inStock: true,
      discount: null,
      soldCount: 0,
      rating: null,
      categoryName: p.categoryName,
      vendorId: p.vendorId
    }));
  }

  return { vendors, products };
}

// ============================================
// RANK VENDORS WITH DYNAMIC DISCOVERY INTELLIGENCE
// ============================================
async function rankVendors(vendors: any[], districtId: number, query: string): Promise<VendorResult[]> {
  if (vendors.length === 0) return [];

  try {
    // Use the dynamic discovery ranking engine
    const rankingContext = {
      query,
      districtId,
      entityType: 'vendor' as const,
      category: 'general'
    };

    const rankings = await dynamicDiscoveryRanking.rankEntities(vendors, rankingContext);

    // Convert back to VendorResult format for compatibility
    const results: (VendorResult | null)[] = rankings.map(ranking => {
      const vendor = vendors.find(v => v.id === ranking.entityId);
      if (!vendor) return null;

      return {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        category: vendor.category || vendor.entityType || vendor.businessType || 'general',
        businessType: vendor.businessType || vendor.category || 'general',
        districtId: vendor.districtId,
        trustScore: vendor.trustScore ?? vendor.dsslScore ?? 0,
        dsslScore: vendor.dsslScore,
        rating: vendor.rating,
        avgRating: vendor.avgRating,
        isVerified: vendor.isVerified,
        description: vendor.description,
        logo: vendor.logo,
        finalScore: ranking.finalScore,
        rank: ranking.rank,
        insights: ranking.insights
      };
    });

    const filtered = results.filter((v): v is VendorResult => v !== null).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
    if (filtered.length > 0) return filtered;
  } catch (err) {
    console.warn("dynamicDiscoveryRanking failed, using fallback vendor ranking:", err);
  }

  // Resilient fallback if dynamicDiscoveryRanking is unavailable
  return vendors.map((v, i) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    category: v.category || v.entityType || v.businessType || 'general',
    businessType: v.businessType || v.category || 'general',
    districtId: v.districtId,
    trustScore: v.trustScore ?? v.dsslScore ?? 0,
    dsslScore: v.dsslScore,
    rating: v.rating,
    avgRating: v.avgRating,
    isVerified: v.isVerified,
    description: v.description,
    logo: v.logo,
    finalScore: v.dsslScore ?? v.trustScore ?? 50,
    rank: i + 1,
    insights: []
  }));
}
