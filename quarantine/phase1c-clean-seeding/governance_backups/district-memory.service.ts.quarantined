/**
 * DISTRICT MEMORY LAYER
 * Sovereign persistent intelligence for BharatOS districts
 *
 * RESPONSIBILITIES:
 * 1. Demand Memory: Track repeated queries and demand patterns
 * 2. Supply Gap Detection: Identify unmet service/business needs
 * 3. Trend Analysis: Monitor query evolution and market shifts
 * 4. Economic Intelligence: Aggregate district commerce patterns
 * 5. Memory Persistence: Store and retrieve district intelligence
 *
 * This transforms districts from reactive to cognitive entities.
 */

import { prisma } from "../storage";
import { bharatOSLogger, LogComponent } from "../lib/logging/structured-logger";

export interface DemandMemory {
  districtId: number;
  domain?: string;
  entity?: string;
  query: string;
  demandCount: number;
  lastQueried: Date;
  trend: 'rising' | 'falling' | 'stable';
}

export interface SupplyGap {
  districtId: number;
  domain: string;
  entity: string;
  demandCount: number;
  urgencyScore: number;
  trendScore: number;
  onboardingReady: boolean;
}

export interface QueryTrend {
  districtId: number;
  query: string;
  frequency: number;
  lastSeen: Date;
  trend: string;
  velocity: number;
  category?: string;
  intent?: string;
}

export interface ServiceGap {
  districtId: number;
  serviceType: string;
  locality?: string;
  demandLevel: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  urgencyScore: number;
  availableProviders: number;
}

export interface DistrictSignal {
  districtId: number;
  signalType: string;
  domain: string;
  entity?: string;
  intensity: number;
  confidence: number;
  context?: any;
  expiresAt?: Date;
}

// ============================================
// ENHANCED DEMAND MEMORY - ECONOMIC INTELLIGENCE
// ============================================

interface DemandIntelligence {
  districtId: number;
  domain: string;
  entity: string;
  query: string;
  intent: string;
  frequency: number;
  lastQueried: Date;
  trend: 'rising' | 'falling' | 'stable';

  // Economic Intelligence
  economicContext: {
    unmetDemandLevel: 'low' | 'medium' | 'high' | 'critical';
    marketGapSize: number; // estimated economic value
    onboardingPotential: number; // 0-1 score
    competitionDensity: number; // nearby providers
    demandVelocity: number; // queries per day trend
  };

  // Temporal Intelligence
  temporalPatterns: {
    peakHours: number[];
    dayPatterns: Record<string, number>; // day -> query count
    seasonalTrends: Record<string, number>; // month -> query count
    urgencyDistribution: Record<string, number>; // low/medium/high/critical
  };

  // Geographic Intelligence
  geographicPatterns: {
    localityHotspots: Array<{locality: string, frequency: number}>;
    distancePreferences: Record<string, number>; // nearby/district/broad
    transportMode: 'walking' | 'auto' | 'bus' | 'mixed';
  };

  // User Intelligence
  userDemographics: {
    repeatUsers: number;
    newUsers: number;
    conversionRate: number;
    abandonmentRate: number;
  };

  // Business Intelligence
  businessInsights: {
    estimatedRevenue: number;
    serviceGap: boolean;
    partnershipOpportunities: string[];
    expansionSignals: string[];
  };
}

export function getUnifiedGroundingIndex(entity: any): string[] {
  const searchableTerms: string[] = [];

  // Core identity terms
  if (entity.title) searchableTerms.push(entity.title.toLowerCase());
  if (entity.subtitle) searchableTerms.push(entity.subtitle.toLowerCase());
  if (entity.name) searchableTerms.push(entity.name.toLowerCase());

  // Category and type terms
  if (entity.category) searchableTerms.push(entity.category.toLowerCase());
  if (entity.entityType) searchableTerms.push(entity.entityType.toLowerCase());
  if (entity.businessType) searchableTerms.push(entity.businessType.toLowerCase());
  if (entity.serviceType) searchableTerms.push(entity.serviceType.toLowerCase());

  // Location terms
  if (entity.address) searchableTerms.push(entity.address.toLowerCase());
  if (entity.city) searchableTerms.push(entity.city.toLowerCase());
  if (entity.locality) searchableTerms.push(entity.locality.toLowerCase());

  // Semantic aliases (expand based on entity type)
  const semanticAliases = getSemanticAliases(entity);
  searchableTerms.push(...semanticAliases);

  // Remove duplicates and return
  return [...new Set(searchableTerms)];
}

function getSemanticAliases(entity: any): string[] {
  const aliases: string[] = [];
  const type = (entity.entityType || entity.businessType || entity.category || '').toLowerCase();

  // Medical aliases
  if (type.includes('hospital') || type.includes('medical') || type.includes('clinic')) {
    aliases.push('hospital', 'clinic', 'doctor', 'medical', 'healthcare', 'नर्सिंग होम', 'डॉक्टर', 'अस्पताल');
  }

  // Education aliases
  if (type.includes('school') || type.includes('education') || type.includes('college')) {
    aliases.push('school', 'college', 'education', 'स्कूल', 'कॉलेज', 'शिक्षा');
  }

  // Add more semantic mappings...

  return aliases;
}

// ============================================
// KNOWLEDGE GRAPH LAYER - SEMANTIC RELATIONSHIPS
// ============================================

interface KnowledgeNode {
  id: string;
  type: 'intent' | 'domain' | 'service' | 'locality' | 'entity' | 'signal';
  name: string;
  metadata: Record<string, any>;
  confidence: number;
}

interface KnowledgeEdge {
  from: string;
  to: string;
  type: 'related_to' | 'provides' | 'located_in' | 'requires' | 'similar_to' | 'trust_signal' | 'demand_signal';
  weight: number; // 0-1 relationship strength
  context: Record<string, any>;
}

class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge[]> = new Map(); // from -> edges[]

  // Core domain knowledge base
  private static readonly DOMAIN_RELATIONSHIPS = {
    'HEALTHCARE': {
      intents: ['medical_help', 'emergency', 'checkup', 'diagnosis', 'treatment'],
      services: ['consultation', 'diagnosis', 'treatment', 'surgery', 'emergency', 'pharmacy'],
      related: ['hospital', 'clinic', 'doctor', 'nurse', 'medicine', 'ambulance', 'icu', 'blood_bank']
    },
    'EDUCATION': {
      intents: ['study', 'admission', 'coaching', 'career', 'exam_prep'],
      services: ['schooling', 'tuition', 'coaching', 'exam_prep', 'admission_consulting'],
      related: ['school', 'college', 'teacher', 'books', 'exam', 'admission']
    },
    'TRANSPORT': {
      intents: ['travel', 'commute', 'delivery', 'taxi', 'bus_timing'],
      services: ['bus', 'taxi', 'auto', 'bike', 'delivery', 'logistics'],
      related: ['route', 'timing', 'fare', 'station', 'terminal', 'parking']
    }
  };

  // Initialize with core domain knowledge
  initializeCoreKnowledge(districtId: number): void {
    // Add domain nodes
    Object.keys(KnowledgeGraph.DOMAIN_RELATIONSHIPS).forEach(domain => {
      this.addNode({
        id: `domain_${domain}`,
        type: 'domain',
        name: domain,
        metadata: { districtId },
        confidence: 1.0
      });

      // Add relationships
      const relationships = KnowledgeGraph.DOMAIN_RELATIONSHIPS[domain as keyof typeof KnowledgeGraph.DOMAIN_RELATIONSHIPS];

      relationships.intents.forEach(intent => {
        this.addNode({
          id: `intent_${intent}`,
          type: 'intent',
          name: intent,
          metadata: { domain },
          confidence: 0.9
        });
        this.addEdge(`intent_${intent}`, `domain_${domain}`, 'related_to', 0.8);
      });

      relationships.services.forEach(service => {
        this.addNode({
          id: `service_${service}`,
          type: 'service',
          name: service,
          metadata: { domain },
          confidence: 0.9
        });
        this.addEdge(`service_${service}`, `domain_${domain}`, 'provides', 0.9);
      });

      relationships.related.forEach(related => {
        this.addNode({
          id: `entity_${related}`,
          type: 'entity',
          name: related,
          metadata: { domain },
          confidence: 0.8
        });
        this.addEdge(`entity_${related}`, `domain_${domain}`, 'related_to', 0.7);
      });
    });
  }

  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(from: string, to: string, type: KnowledgeEdge['type'], weight: number, context?: any): void {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push({
      from,
      to,
      type,
      weight,
      context: context || {}
    });
  }

  // Semantic traversal for query expansion
  traverseSemanticGraph(query: string, cognition: any): string[] {
    const expandedTerms: string[] = [];
    const visited = new Set<string>();

    // Start from detected intent
    const startNodeId = `intent_${cognition.intent || 'general'}`;

    if (this.nodes.has(startNodeId)) {
      this.traverseFromNode(startNodeId, expandedTerms, visited, 2); // depth 2
    }

    // Also traverse from domain
    const domainNodeId = `domain_${cognition.domain || 'GENERAL'}`;
    if (this.nodes.has(domainNodeId)) {
      this.traverseFromNode(domainNodeId, expandedTerms, visited, 2);
    }

    return [...new Set(expandedTerms)]; // Remove duplicates
  }

  private traverseFromNode(nodeId: string, terms: string[], visited: Set<string>, depth: number): void {
    if (depth <= 0 || visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = this.nodes.get(nodeId);
    if (node) {
      terms.push(node.name);

      // Traverse outgoing edges
      const edges = this.edges.get(nodeId) || [];
      for (const edge of edges) {
        if (edge.weight > 0.6) { // Only strong relationships
          this.traverseFromNode(edge.to, terms, visited, depth - 1);
        }
      }
    }
  }

  // Add learned relationships from demand patterns
  learnFromDemand(demand: DemandIntelligence): void {
    const domainNodeId = `domain_${demand.domain}`;
    const entityNodeId = `entity_${demand.entity}`;

    // Strengthen existing relationships based on demand
    if (demand.frequency > 10) {
      // High demand entity gets stronger domain link
      this.addEdge(entityNodeId, domainNodeId, 'related_to', Math.min(1.0, 0.7 + (demand.frequency * 0.01)));
    }

    // Add locality relationships
    demand.geographicPatterns.localityHotspots.forEach(hotspot => {
      const localityNodeId = `locality_${hotspot.locality}`;
      this.addNode({
        id: localityNodeId,
        type: 'locality',
        name: hotspot.locality,
        metadata: { districtId: demand.districtId },
        confidence: 0.7
      });
      this.addEdge(entityNodeId, localityNodeId, 'located_in', 0.8);
    });
  }
}

// Global knowledge graph instance
export const knowledgeGraph = new KnowledgeGraph();

// Initialize core knowledge
knowledgeGraph.initializeCoreKnowledge(1); // Shahdol district

// ============================================
// FUZZY MATCHING & TYPO TOLERANCE
// ============================================

interface FuzzyMatch {
  term: string;
  score: number; // 0-1 similarity score
  matchedTerm: string;
}

export function findFuzzyMatches(query: string, searchableTerms: string[]): FuzzyMatch[] {
  const results: FuzzyMatch[] = [];
  const queryLower = query.toLowerCase();

  for (const term of searchableTerms) {
    const termLower = term.toLowerCase();

    // Exact match = highest score
    if (termLower === queryLower) {
      results.push({ term: query, score: 1.0, matchedTerm: term });
      continue;
    }

    // Contains match
    if (termLower.includes(queryLower) || queryLower.includes(termLower)) {
      results.push({ term: query, score: 0.8, matchedTerm: term });
      continue;
    }

    // Levenshtein distance for typos
    const distance = levenshteinDistance(queryLower, termLower);
    const maxLength = Math.max(queryLower.length, termLower.length);
    const similarity = 1 - (distance / maxLength);

    if (similarity >= 0.6) { // 60% similarity threshold
      results.push({ term: query, score: similarity, matchedTerm: term });
    }

    // Hindi phonetic matching
    const hindiPhonetic = getHindiPhonetic(queryLower);
    const termPhonetic = getHindiPhonetic(termLower);
    if (hindiPhonetic && termPhonetic && hindiPhonetic === termPhonetic) {
      results.push({ term: query, score: 0.9, matchedTerm: term });
    }

    // Common Hindi misspellings
    const corrections = getHindiCorrections(queryLower);
    for (const correction of corrections) {
      if (termLower.includes(correction)) {
        results.push({ term: query, score: 0.7, matchedTerm: term });
      }
    }
  }

  // Remove duplicates and sort by score
  const unique = results.filter((item, index, self) =>
    index === self.findIndex(t => t.term === item.term && t.matchedTerm === item.matchedTerm)
  );

  return unique.sort((a, b) => b.score - a.score);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function getHindiPhonetic(word: string): string | null {
  // Simple Hindi phonetic mapping for common words
  const phoneticMap: Record<string, string> = {
    'hospital': 'aspatal',
    'doctor': 'daktar',
    'school': 'skul',
    'clinic': 'klinik',
    'pharmacy': 'farmasi',
    'restaurant': 'restorant',
    'hotel': 'hotel',
    'bus': 'bas',
    'taxi': 'taksi'
  };

  return phoneticMap[word] || null;
}

function getHindiCorrections(word: string): string[] {
  // Common Hindi misspellings and corrections
  const correctionMap: Record<string, string[]> = {
    'asptal': ['hospital', 'aspatal'],
    'aspataal': ['hospital', 'aspatal'],
    'haspatal': ['hospital', 'aspatal'],
    'dacter': ['doctor', 'daktar'],
    'docter': ['doctor', 'daktar'],
    'restaurent': ['restaurant', 'restorant'],
    'restaraunt': ['restaurant', 'restorant'],
    'skool': ['school', 'skul'],
    'farmacey': ['pharmacy', 'farmasi']
  };

  return correctionMap[word] || [];
}

export class DistrictMemoryLayer {
  private static instance: DistrictMemoryLayer;

  private constructor() { }

  static getInstance(): DistrictMemoryLayer {
    if (!DistrictMemoryLayer.instance) {
      DistrictMemoryLayer.instance = new DistrictMemoryLayer();
    }
    return DistrictMemoryLayer.instance;
  }

  // ============================================
  // DEMAND MEMORY MANAGEMENT
  // ============================================

  async recordDemand(params: {
    districtId: number;
    query: string;
    domain?: string;
    entity?: string;
    category?: string;
    intent?: string;
    signals?: any[]; // ConstitutedSignal[] - full signal metadata
    normalizedIntent?: string;
    confidence?: number;
    matchedEntities?: number;
    // Optional resolved semantic category from telemetry (added Phase 1C-A)
    resolvedCategory?: string; // e.g. 'electronics.store' | 'electronics.repair' | 'electronics.ambiguous'
  }): Promise<void> {
    try {
      const { districtId, query, domain, entity, category, intent, signals, normalizedIntent, confidence, matchedEntities, resolvedCategory } = params;

      // Determine memory keys: use resolvedCategory as primary semantic signal when available
      // but preserve legacy 'domain' as primary grouping for historical continuity.
      const semanticCategory = resolvedCategory || domain || 'general';

      // Record in demand memory - now with semantic augmentation (non-breaking)
      const updateData = {
        demandCount: { increment: 1 },
        lastQueried: new Date(),
        query,
        originalQuery: query ?? null,
        // ALWAYS write canonical metadata, never conditional
        intent: intent ?? null,
        category: category ?? null,
        signals: signals ? JSON.stringify(signals) : null, // Store full signal constitution
        normalizedIntent: normalizedIntent ?? null,
        confidence: confidence ?? null,
        matchedEntities: matchedEntities ?? 0,
        // Semantic augmentation - additive fields to enable semantic memory without breaking legacy keys
        resolvedCategory: resolvedCategory ?? null
      };

      console.log('UPSERT_UPDATE_PAYLOAD', {
        districtId,
        domain: domain || 'general',
        entity: entity || 'unknown',
        updateData
      });

      // Upsert into legacy grouping (domain/entity) to preserve historical continuity
      const upsertResult = await prisma.districtDemandMemory.upsert({
        where: {
          districtId_domain_entity: {
            districtId,
            domain: domain || 'general',
            entity: entity || 'unknown'
          }
        },
        update: updateData,
        create: {
          districtId,
          domain: domain || 'general',
          entity: entity || 'unknown',
          query,
          originalQuery: query ?? null,
          intent: intent ?? null,
          category: category ?? null,
          signals: signals ? JSON.stringify(signals) : null,
          normalizedIntent: normalizedIntent ?? null,
          confidence: confidence ?? null,
          matchedEntities: matchedEntities ?? 0,
          demandCount: 1,
          lastQueried: new Date()
        }
      });

      // Additionally, record semantic-aware memory under resolvedCategory key (additive)
      if (semanticCategory && semanticCategory !== (domain || 'general')) {
        try {
          await prisma.districtDemandMemory.upsert({
            where: {
              districtId_domain_entity: {
                districtId,
                domain: semanticCategory,
                entity: entity || 'unknown'
              }
            },
            update: updateData,
            create: {
              districtId,
              domain: semanticCategory,
              entity: entity || 'unknown',
              query,
              originalQuery: query ?? null,
              intent: intent ?? null,
              category: category ?? null,
              signals: signals ? JSON.stringify(signals) : null,
              normalizedIntent: normalizedIntent ?? null,
              confidence: confidence ?? null,
              matchedEntities: matchedEntities ?? 0,
              demandCount: 1,
              lastQueried: new Date(),
              // store resolvedCategory on row for observability
              resolvedCategory: resolvedCategory ?? null
            }
          });
        } catch (err) {
          // Non-fatal: semantic upsert failure should not block legacy upsert
          console.warn('Semantic upsert failed:', err);
        }
      }

      console.log('UPSERT_RESULT', {
        id: upsertResult.id,
        districtId: upsertResult.districtId,
        domain: upsertResult.domain,
        entity: upsertResult.entity,
        normalizedIntent: upsertResult.normalizedIntent,
        confidence: upsertResult.confidence,
        matchedEntities: upsertResult.matchedEntities,
        demandCount: upsertResult.demandCount
      });

      // Record query trend (legacy grouping)
      await this.updateQueryTrend({
        districtId,
        query,
        category: domain,
        intent: params.intent
      });

      // Record semantic-aware query trend if resolvedCategory provided
      if (semanticCategory && semanticCategory !== (domain || 'general')) {
        try {
          await this.updateQueryTrend({
            districtId,
            query,
            category: semanticCategory,
            intent: params.intent
          });
        } catch (err) {
          console.warn('Semantic trend update failed:', err);
        }
      }

      // Check for supply gaps
      await this.detectSupplyGap({
        districtId,
        domain: domain || 'general',
        entity: entity || 'unknown',
        query
      });

    } catch (error) {
      console.warn('Failed to record demand:', error);
    }
  }

  /**
   * Record failed search for district intelligence
   * This helps identify unmet demand and gaps in service coverage
   */
  async recordFailedSearch(params: {
    districtId: number;
    query: string;
    expandedTerms: string[];
    confidence: number;
    attemptedCategories: string;
  }): Promise<void> {
    try {
      const { districtId, query, expandedTerms, confidence, attemptedCategories } = params;

      // Record as demand signal with low confidence indicator
      const failedSearchUpdateData = {
        demandCount: { increment: 1 },
        lastQueried: new Date(),
        query: `${query} [FAILED: ${expandedTerms.join(', ')}]`,
        originalQuery: query ?? null,
        confidence: confidence ?? 0.3,
        matchedEntities: 0
      };

      console.log('UPSERT_UPDATE_PAYLOAD (failed_search)', {
        districtId,
        domain: attemptedCategories,
        entity: 'failed_search',
        updateData: failedSearchUpdateData
      });

      const failedSearchResult = await prisma.districtDemandMemory.upsert({
        where: {
          districtId_domain_entity: {
            districtId,
            domain: attemptedCategories,
            entity: 'failed_search'
          }
        },
        update: failedSearchUpdateData,
        create: {
          districtId,
          domain: attemptedCategories,
          entity: 'failed_search',
          query: `${query} [FAILED: ${expandedTerms.join(', ')}]`,
          originalQuery: query ?? null,
          confidence: confidence ?? 0.3,
          matchedEntities: 0,
          demandCount: 1,
          lastQueried: new Date()
        }
      });

      console.log('UPSERT_RESULT (failed_search)', {
        id: failedSearchResult.id,
        query: failedSearchResult.query,
        confidence: failedSearchResult.confidence,
        demandCount: failedSearchResult.demandCount
      });

      // Also record in supply gaps if confidence was reasonable but no results
      if (confidence > 0.5) {
        await prisma.districtSupplyGap.upsert({
          where: {
            districtId_domain_entity: {
              districtId,
              domain: attemptedCategories,
              entity: 'unmet_demand'
            }
          },
          update: {
            demandCount: { increment: 1 },
            lastDetected: new Date(),
            severity: 'medium',
            context: {
              failedQuery: query,
              expandedTerms,
              confidence,
              timestamp: new Date().toISOString()
            }
          },
          create: {
            districtId,
            domain: attemptedCategories,
            entity: 'unmet_demand',
            demandCount: 1,
            severity: 'medium',
            lastDetected: new Date(),
            context: {
              failedQuery: query,
              expandedTerms,
              confidence,
              timestamp: new Date().toISOString()
            }
          }
        });
      }

    } catch (error) {
      console.warn('Failed to record failed search signal:', error);
    }
  }

  async recordSearchSuccess(params: {
    districtId: number;
    query: string;
    matchedEntities: number;
    domain?: string;
    entity?: string;
    intent?: string;
  }): Promise<void> {
    // Record successful search patterns for learning
    // This could update query trends, domain popularity, etc.
    bharatOSLogger.debug(LogComponent.DEMAND, 'search_success_logged', 'Successful search logged', params);
    
    // TODO: Implement search success recording logic
    // Could update:
    // - QueryTrend popularity
    // - Domain success rates
    // - Entity discovery rates
    // - Intent success patterns
  }

  /**
   * Aggregate district demand by normalized intent
   * Creates demand map showing what district users actually need
   */
  async aggregateDistrictDemand(districtId: number): Promise<{
    intent: string;
    totalSearches: number;
    avgConfidence: number;
    totalEntitiesMatched: number;
    lastQueried: Date;
  }[]> {
    try {
      const demandData = await prisma.districtDemandMemory.groupBy({
        by: ['normalizedIntent'],
        where: {
          districtId,
          normalizedIntent: { not: null }
        },
        _sum: {
          demandCount: true,
          matchedEntities: true
        },
        _avg: {
          confidence: true
        },
        _max: {
          lastQueried: true
        }
      });

      return demandData.map(item => ({
        intent: item.normalizedIntent!,
        totalSearches: item._sum.demandCount || 0,
        avgConfidence: item._avg.confidence || 0,
        totalEntitiesMatched: item._sum.matchedEntities || 0,
        lastQueried: item._max.lastQueried!
      })).sort((a, b) => b.totalSearches - a.totalSearches);

    } catch (error) {
      console.warn('Failed to aggregate district demand:', error);
      return [];
    }
  }

  /**
   * Calculate supply vs demand gaps
   * Compares user intent demand against available service partners
   */
  async calculateSupplyGaps(districtId: number): Promise<{
    intent: string;
    demand: number;
    supply: number;
    gapRatio: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[]> {
    try {
      // Get aggregated demand
      const demandData = await this.aggregateDistrictDemand(districtId);

      // Get supply data (active vendors by category)
      const supplyData = await prisma.vendor.groupBy({
        by: ['category'],
        where: {
          districtId,
          status: 'APPROVED',
          isShadowBanned: false
        },
        _count: {
          id: true
        }
      });

      // Create supply map
      const supplyMap = new Map<string, number>();
      supplyData.forEach(item => {
        const categoryKey = item.category.toString();
        supplyMap.set(categoryKey, item._count.id);
      });

      // Map demand intents to vendor categories
      const intentToCategoryMap: Record<string, string> = {
        'healthcare': 'HOSPITAL',
        'hospital': 'HOSPITAL',
        'pharmacy': 'PHARMACY',
        'electrician': 'SERVICE',
        'electronics': 'SERVICE',
        'carpenter': 'SERVICE',
        'mechanic': 'SERVICE',
        'restaurant': 'SERVICE',
        'grocery': 'GROCERY',
        'school': 'EDUCATION',
        'taxi': 'TRANSPORT'
      };

      // Calculate gaps
      const gaps = demandData.map(demand => {
        const category = intentToCategoryMap[demand.intent.toLowerCase()] || demand.intent.toUpperCase();
        const supply = supplyMap.get(category) || 0;
        const gapRatio = supply > 0 ? demand.totalSearches / supply : demand.totalSearches;

        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (gapRatio > 10) severity = 'critical';
        else if (gapRatio > 5) severity = 'high';
        else if (gapRatio > 2) severity = 'medium';
        else severity = 'low';

        return {
          intent: demand.intent,
          demand: demand.totalSearches,
          supply,
          gapRatio: Math.round(gapRatio * 100) / 100,
          severity
        };
      });

      return gaps.sort((a, b) => b.gapRatio - a.gapRatio);

    } catch (error) {
      console.warn('Failed to calculate supply gaps:', error);
      return [];
    }
  }

  /**
   * Get query trends over time periods
   * Tracks hourly, daily, weekly demand patterns
   */
  async getQueryTrends(districtId: number, hoursBack: number = 24): Promise<{
    query: string;
    intent: string;
    searches: number;
    timeRange: string;
  }[]> {
    try {
      const since = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));

      const trends = await prisma.districtDemandMemory.findMany({
        where: {
          districtId,
          lastQueried: { gte: since },
          normalizedIntent: { not: null }
        },
        select: {
          query: true,
          normalizedIntent: true,
          demandCount: true,
          lastQueried: true
        },
        orderBy: { demandCount: 'desc' },
        take: 50
      });

      return trends.map(trend => ({
        query: trend.query,
        intent: trend.normalizedIntent!,
        searches: trend.demandCount,
        timeRange: `${hoursBack} hours`
      }));

    } catch (error) {
      console.warn('Failed to get query trends:', error);
      return [];
    }
  }

  /**
   * Track temporal demand patterns
   * Useful for understanding when demand spikes occur
   */
  async getTemporalDemandPatterns(districtId: number): Promise<{
    hour: number;
    day: number;
    intent: string;
    avgSearches: number;
  }[]> {
    try {
      // This would require more complex aggregation
      // For now, return basic structure
      const patterns: any[] = [];

      // TODO: Implement hourly/daily demand pattern analysis
      // Would aggregate searches by hour of day, day of week, etc.

      return patterns;

    } catch (error) {
      console.warn('Failed to get temporal demand patterns:', error);
      return [];
    }
  }

  async getDemandMemory(districtId: number, domain?: string): Promise<DemandMemory[]> {
    const where: any = { districtId };
    if (domain) where.domain = domain;

    const memories = await prisma.districtDemandMemory.findMany({
      where,
      orderBy: { demandCount: 'desc' },
      take: 100
    });

    return memories.map(m => ({
      districtId: m.districtId,
      domain: m.domain || undefined,
      entity: m.entity || undefined,
      query: m.query,
      demandCount: m.demandCount,
      lastQueried: m.lastQueried,
      trend: 'stable' as const // TODO: Calculate trend
    }));
  }

  async recordDemandIntelligence(params: {
    districtId: number;
    query: string;
    cognition: any;
    intent: any;
    userId?: number;
    location?: { lat: number; lng: number };
    timestamp: Date;
  }): Promise<void> {
    const { districtId, query, cognition, intent, userId, location, timestamp } = params;

    // Calculate economic intelligence
    const economicContext = await this.calculateEconomicContext(districtId, cognition.domain, cognition.entity);
    const temporalPatterns = this.analyzeTemporalPatterns(timestamp);
    const geographicPatterns = await this.analyzeGeographicPatterns(districtId, location);

    // Record enhanced demand intelligence
    await prisma.demandIntelligence.upsert({
      where: {
        districtId_domain_entity: {
          districtId,
          domain: cognition.domain,
          entity: cognition.entity
        }
      },
      update: {
        frequency: { increment: 1 },
        lastQueried: timestamp,
        economicContext,
        temporalPatterns,
        geographicPatterns,
        // Update user demographics, business insights
      },
      create: {
        districtId,
        domain: cognition.domain,
        entity: cognition.entity,
        query,
        intent: intent.primaryIntent,
        frequency: 1,
        lastQueried: timestamp,
        trend: 'stable',
        economicContext,
        temporalPatterns,
        geographicPatterns,
        userDemographics: {
          repeatUsers: 0,
          newUsers: 1,
          conversionRate: 0,
          abandonmentRate: 0
        },
        businessInsights: {
          estimatedRevenue: 0,
          serviceGap: true,
          partnershipOpportunities: [],
          expansionSignals: []
        }
      }
    });
  }

  private async calculateEconomicContext(districtId: number, domain: string, entity: string) {
    // Calculate market gap, competition density, etc.
    const nearbyProviders = await this.countNearbyProviders(districtId, domain, entity);
    const demandVelocity = await this.calculateDemandVelocity(districtId, domain, entity);

    return {
      unmetDemandLevel: nearbyProviders === 0 ? 'critical' : nearbyProviders < 3 ? 'high' : 'medium',
      marketGapSize: nearbyProviders === 0 ? 100000 : nearbyProviders < 3 ? 50000 : 10000,
      onboardingPotential: nearbyProviders === 0 ? 0.9 : nearbyProviders < 3 ? 0.7 : 0.3,
      competitionDensity: nearbyProviders,
      demandVelocity
    };
  }

  private analyzeTemporalPatterns(timestamp: Date) {
    const hour = timestamp.getHours();
    const day = timestamp.toLocaleLowerCase('en-US', { weekday: 'long' });
    const month = timestamp.toLocaleLowerCase('en-US', { month: 'long' });

    return {
      peakHours: [hour],
      dayPatterns: { [day]: 1 },
      seasonalTrends: { [month]: 1 },
      urgencyDistribution: { medium: 1 }
    };
  }

  private async analyzeGeographicPatterns(districtId: number, location?: { lat: number; lng: number }) {
    // Analyze geographic patterns
    return {
      localityHotspots: location ? [{ locality: 'current_location', frequency: 1 }] : [],
      distancePreferences: { district: 1 },
      transportMode: 'mixed' as const
    };
  }

  private async countNearbyProviders(districtId: number, domain: string, entity: string): Promise<number> {
    // Stub implementation: count providers in the district for the domain/entity
    const categoryMap: Record<string, string> = {
      'hospital': 'HOSPITAL',
      'doctor': 'HOSPITAL',
      'pharmacy': 'PHARMACY',
      'grocery': 'GROCERY',
      'kirana': 'GROCERY',
      'service': 'SERVICE',
      'education': 'EDUCATION',
      'transport': 'TRANSPORT'
    };

    const category = categoryMap[entity.toLowerCase()] || categoryMap[domain.toLowerCase()];
    if (!category) return 0;

    return await prisma.vendor.count({
      where: {
        districtId,
        category,
        status: 'APPROVED'
      }
    });
  }

  private async calculateDemandVelocity(districtId: number, domain: string, entity: string): Promise<number> {
    // Stub implementation: calculate queries per day trend
    // For simplicity, return a fixed value or calculate based on recent data
    const recentDemand = await prisma.districtDemandMemory.findUnique({
      where: {
        districtId_domain_entity: { districtId, domain, entity }
      }
    });

    if (!recentDemand) return 1;

    const daysSinceLast = (Date.now() - recentDemand.lastQueried.getTime()) / (1000 * 60 * 60 * 24);
    return recentDemand.demandCount / Math.max(daysSinceLast, 1);
  }

  // ============================================
  // SUPPLY GAP DETECTION
  // ============================================

  private async detectSupplyGap(params: {
    districtId: number;
    domain: string;
    entity: string;
    query: string;
  }): Promise<void> {
    const { districtId, domain, entity, query } = params;

    // Check if this demand exceeds available supply
    const demand = await prisma.districtDemandMemory.findUnique({
      where: {
        districtId_domain_entity: { districtId, domain, entity }
      }
    });

    if (!demand || demand.demandCount < 3) return; // Need minimum demand signal

    // Count available providers for this domain/entity
    const providerCount = await this.countAvailableProviders(districtId, domain, entity);

    // Calculate urgency score based on demand vs supply
    const urgencyScore = Math.min(demand.demandCount / Math.max(providerCount + 1, 1), 10);

    if (urgencyScore >= 2.0) { // Threshold for supply gap
      await prisma.districtSupplyGap.upsert({
        where: {
          districtId_domain_entity: { districtId, domain, entity }
        },
        update: {
          demandCount: demand.demandCount,
          urgencyScore,
          trendScore: { increment: 0.1 },
          lastSeenAt: new Date(),
          onboardingReady: urgencyScore >= 5.0
        },
        create: {
          districtId,
          domain,
          entity,
          demandCount: demand.demandCount,
          urgencyScore,
          trendScore: 1.0,
          onboardingReady: urgencyScore >= 5.0
        }
      });

      // Emit supply gap signal
      await this.emitDistrictSignal({
        districtId,
        signalType: 'supply_gap',
        domain,
        entity,
        intensity: urgencyScore / 10,
        confidence: 0.8,
        context: { query, demandCount: demand.demandCount, providerCount }
      });
    }
  }

  private async countAvailableProviders(districtId: number, domain: string, entity: string): Promise<number> {
    // Count vendors matching the domain/entity
    const categoryMap: Record<string, string> = {
      'hospital': 'HOSPITAL',
      'doctor': 'HOSPITAL',
      'pharmacy': 'PHARMACY',
      'grocery': 'GROCERY',
      'kirana': 'GROCERY',
      'service': 'SERVICE',
      'education': 'EDUCATION',
      'transport': 'TRANSPORT'
    };

    const category = categoryMap[entity.toLowerCase()] || categoryMap[domain.toLowerCase()];
    if (!category) return 0;

    return await prisma.vendor.count({
      where: {
        districtId,
        category,
        status: 'APPROVED'
      }
    });
  }

  async getSupplyGaps(districtId: number, minUrgency: number = 1.0): Promise<SupplyGap[]> {
    const gaps = await prisma.districtSupplyGap.findMany({
      where: {
        districtId,
        urgencyScore: { gte: minUrgency }
      },
      orderBy: { urgencyScore: 'desc' },
      take: 50
    });

    return gaps.map(g => ({
      districtId: g.districtId,
      domain: g.domain,
      entity: g.entity,
      demandCount: g.demandCount,
      urgencyScore: g.urgencyScore,
      trendScore: g.trendScore,
      onboardingReady: g.onboardingReady
    }));
  }

  // ============================================
  // QUERY TREND ANALYSIS
  // ============================================

  private async updateQueryTrend(params: {
    districtId: number;
    query: string;
    category?: string;
    intent?: string;
  }): Promise<void> {
    const { districtId, query, category, intent } = params;

    const existing = await prisma.queryTrend.findUnique({
      where: {
        districtId_query: { districtId, query }
      }
    });

    if (existing) {
      // Update frequency and calculate trend
      const timeDiff = Date.now() - existing.lastSeen.getTime();
      const velocity = existing.frequency / Math.max(timeDiff / (1000 * 60 * 60 * 24), 1); // queries per day

      const trend = velocity > existing.velocity ? 'rising' :
        velocity < existing.velocity * 0.8 ? 'falling' : 'stable';

      await prisma.queryTrend.update({
        where: { id: existing.id },
        data: {
          frequency: { increment: 1 },
          lastSeen: new Date(),
          trend,
          velocity,
          category,
          intent
        }
      });
    } else {
      await prisma.queryTrend.create({
        data: {
          districtId,
          query,
          frequency: 1,
          lastSeen: new Date(),
          trend: 'stable',
          velocity: 1,
          category,
          intent
        }
      });
    }
  }

  async getQueryTrends(districtId: number, limit: number = 50): Promise<QueryTrend[]> {
    const trends = await prisma.queryTrend.findMany({
      where: { districtId },
      orderBy: { frequency: 'desc' },
      take: limit
    });

    return trends.map(t => ({
      districtId: t.districtId,
      query: t.query,
      frequency: t.frequency,
      lastSeen: t.lastSeen,
      trend: t.trend,
      velocity: t.velocity,
      category: t.category || undefined,
      intent: t.intent || undefined
    }));
  }

  // ============================================
  // SERVICE GAP MANAGEMENT
  // ============================================

  async recordServiceGap(params: {
    districtId: number;
    serviceType: string;
    locality?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const { districtId, serviceType, locality, urgency } = params;

    const urgencyScore = { low: 1, medium: 3, high: 7, critical: 10 }[urgency];

    await prisma.serviceGap.upsert({
      where: {
        districtId_serviceType_locality: {
          districtId,
          serviceType,
          locality: locality || 'general'
        }
      },
      update: {
        frequency: { increment: 1 },
        lastDemand: new Date(),
        demandLevel: urgency,
        urgencyScore: Math.max(urgencyScore, { low: 1, medium: 3, high: 7, critical: 10 }[urgency])
      },
      create: {
        districtId,
        serviceType,
        locality,
        demandLevel: urgency,
        frequency: 1,
        urgencyScore,
        lastDemand: new Date(),
        availableProviders: 0
      }
    });

    // Update provider count
    await this.updateServiceProviderCount(districtId, serviceType, locality);
  }

  private async updateServiceProviderCount(districtId: number, serviceType: string, locality?: string): Promise<void> {
    const providerCount = await prisma.serviceWorker.count({
      where: {
        districtId,
        serviceType,
        isAvailable: true,
        ...(locality && locality !== 'general' ? {
          serviceArea: { contains: locality }
        } : {})
      }
    });

    await prisma.serviceGap.updateMany({
      where: {
        districtId,
        serviceType,
        locality: locality || 'general'
      },
      data: { availableProviders: providerCount }
    });
  }

  async getServiceGaps(districtId: number): Promise<ServiceGap[]> {
    const gaps = await prisma.serviceGap.findMany({
      where: { districtId },
      orderBy: { urgencyScore: 'desc' },
      take: 100
    });

    return gaps.map(g => ({
      districtId: g.districtId,
      serviceType: g.serviceType,
      locality: g.locality || undefined,
      demandLevel: g.demandLevel as 'low' | 'medium' | 'high' | 'critical',
      frequency: g.frequency,
      urgencyScore: g.urgencyScore,
      availableProviders: g.availableProviders
    }));
  }

  // ============================================
  // DISTRICT SIGNAL MANAGEMENT
  // ============================================

  private async emitDistrictSignal(signal: DistrictSignal): Promise<void> {
    await prisma.districtSignal.create({
      data: {
        districtId: signal.districtId,
        signalType: signal.signalType,
        domain: signal.domain,
        entity: signal.entity,
        intensity: signal.intensity,
        confidence: signal.confidence,
        context: signal.context,
        expiresAt: signal.expiresAt
      }
    });
  }

  async getDistrictSignals(districtId: number, signalType?: string): Promise<DistrictSignal[]> {
    const where: any = {
      districtId,
      expiresAt: { gt: new Date() }
    };
    if (signalType) where.signalType = signalType;

    const signals = await prisma.districtSignal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return signals.map(s => ({
      districtId: s.districtId,
      signalType: s.signalType,
      domain: s.domain,
      entity: s.entity || undefined,
      intensity: s.intensity,
      confidence: s.confidence,
      context: s.context,
      expiresAt: s.expiresAt || undefined
    }));
  }

  // ============================================
  // PARTNER INTERACTION TRACKING
  // ============================================

  async recordPartnerInteraction(params: {
    districtId: number;
    partnerType: string;
    partnerId: number;
    interactionType: string;
    value?: number;
    context?: any;
  }): Promise<void> {
    await prisma.partnerInteraction.create({
      data: {
        districtId: params.districtId,
        partnerType: params.partnerType,
        partnerId: params.partnerId,
        interactionType: params.interactionType,
        value: params.value,
        context: params.context
      }
    });
  }

  async getPartnerInteractions(districtId: number, partnerId?: number): Promise<any[]> {
    const where: any = { districtId };
    if (partnerId) where.partnerId = partnerId;

    return await prisma.partnerInteraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  // ============================================
  // MEMORY AGGREGATION & INSIGHTS
  // ============================================

  async getDistrictIntelligence(districtId: number): Promise<{
    demandPatterns: any[];
    supplyGaps: SupplyGap[];
    trendingQueries: QueryTrend[];
    serviceNeeds: ServiceGap[];
    activeSignals: DistrictSignal[];
    economicHealth: number;
  }> {
    const [
      demandPatterns,
      supplyGaps,
      trendingQueries,
      serviceNeeds,
      activeSignals
    ] = await Promise.all([
      this.getDemandMemory(districtId),
      this.getSupplyGaps(districtId),
      this.getQueryTrends(districtId, 20),
      this.getServiceGaps(districtId),
      this.getDistrictSignals(districtId)
    ]);

    // Calculate economic health score (0-100)
    const economicHealth = this.calculateEconomicHealth({
      supplyGaps,
      serviceNeeds,
      activeSignals
    });

    return {
      demandPatterns,
      supplyGaps,
      trendingQueries,
      serviceNeeds,
      activeSignals,
      economicHealth
    };
  }

  private calculateEconomicHealth(params: {
    supplyGaps: SupplyGap[];
    serviceNeeds: ServiceGap[];
    activeSignals: DistrictSignal[];
  }): number {
    const { supplyGaps, serviceNeeds, activeSignals } = params;

    // Base score of 80 (good district health)
    let score = 80;

    // Deduct for supply gaps (high urgency gaps hurt more)
    const highUrgencyGaps = supplyGaps.filter(g => g.urgencyScore >= 5).length;
    score -= highUrgencyGaps * 5;

    // Deduct for critical service needs
    const criticalNeeds = serviceNeeds.filter(n => n.demandLevel === 'critical').length;
    score -= criticalNeeds * 3;

    // Boost for positive signals
    const positiveSignals = activeSignals.filter(s =>
      s.signalType.includes('growth') || s.signalType.includes('opportunity')
    ).length;
    score += positiveSignals * 2;

    return Math.max(0, Math.min(100, score));
  }

  // ============================================
  // MEMORY CLEANUP & MAINTENANCE
  // ============================================

  async cleanupExpiredMemory(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Remove old signals
    await prisma.districtSignal.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    // Archive old demand memory (keep recent high-frequency ones)
    await prisma.districtDemandMemory.deleteMany({
      where: {
        lastQueried: { lt: thirtyDaysAgo },
        demandCount: { lt: 5 }
      }
    });

    // Clean old query trends
    await prisma.queryTrend.deleteMany({
      where: {
        lastSeen: { lt: thirtyDaysAgo },
        frequency: { lt: 3 }
      }
    });
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

// ============================================
// TRUST INTEGRITY ENGINE - SIGNAL CORRUPTION DETECTION
// ============================================

interface TrustAnomaly {
  vendorId: number;
  anomalyType: 'keyword_stuffing' | 'click_farming' | 'review_inflation' | 'locality_spoofing' | 'trust_decay';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string[];
  detectedAt: Date;
  recommendedAction: 'monitor' | 'suppress' | 'flag' | 'ban';
}

interface TrustSignal {
  vendorId: number;
  signalType: 'click' | 'view' | 'booking' | 'review' | 'search';
  value: number;
  timestamp: Date;
  source: 'organic' | 'suspicious' | 'verified';
  context: Record<string, any>;
}

class TrustIntegrityEngine {
  private static instance: TrustIntegrityEngine;
  private anomalies: Map<number, TrustAnomaly[]> = new Map(); // vendorId -> anomalies

  static getInstance(): TrustIntegrityEngine {
    if (!TrustIntegrityEngine.instance) {
      TrustIntegrityEngine.instance = new TrustIntegrityEngine();
    }
    return TrustIntegrityEngine.instance;
  }

  // Detect keyword stuffing
  detectKeywordStuffing(vendorId: number, searchTerms: string[], entityTitle: string): TrustAnomaly | null {
    const titleWords = entityTitle.toLowerCase().split(/\s+/);
    const keywordMatches = searchTerms.filter(term =>
      titleWords.some(word => word.includes(term.toLowerCase()))
    );

    const stuffingRatio = keywordMatches.length / titleWords.length;

    if (stuffingRatio > 0.7) { // More than 70% of title is keywords
      return {
        vendorId,
        anomalyType: 'keyword_stuffing',
        severity: stuffingRatio > 0.9 ? 'high' : 'medium',
        confidence: 0.85,
        evidence: [
          `Title: "${entityTitle}"`,
          `Keyword matches: ${keywordMatches.join(', ')}`,
          `Stuffing ratio: ${(stuffingRatio * 100).toFixed(1)}%`
        ],
        detectedAt: new Date(),
        recommendedAction: stuffingRatio > 0.9 ? 'flag' : 'monitor'
      };
    }
    return null;
  }

  // Detect click farming patterns
  detectClickFarming(vendorId: number, clickSignals: TrustSignal[]): TrustAnomaly | null {
    if (clickSignals.length < 10) return null;

    // Analyze click patterns
    const hourlyClicks = new Map<number, number>();
    const userAgents = new Set<string>();

    clickSignals.forEach(signal => {
      const hour = signal.timestamp.getHours();
      hourlyClicks.set(hour, (hourlyClicks.get(hour) || 0) + 1);
      if (signal.context.userAgent) {
        userAgents.add(signal.context.userAgent);
      }
    });

    // Suspicious patterns
    const maxHourlyClicks = Math.max(...hourlyClicks.values());
    const clickConcentration = maxHourlyClicks / clickSignals.length;
    const userAgentDiversity = userAgents.size / clickSignals.length;

    if (clickConcentration > 0.8 && userAgentDiversity < 0.1) {
      return {
        vendorId,
        anomalyType: 'click_farming',
        severity: 'high',
        confidence: 0.9,
        evidence: [
          `Click concentration: ${(clickConcentration * 100).toFixed(1)}% in single hour`,
          `User agent diversity: ${(userAgentDiversity * 100).toFixed(1)}%`,
          `Total clicks analyzed: ${clickSignals.length}`
        ],
        detectedAt: new Date(),
        recommendedAction: 'suppress'
      };
    }

    return null;
  }

  // Detect review inflation
  detectReviewInflation(vendorId: number, reviews: any[]): TrustAnomaly | null {
    if (reviews.length < 5) return null;

    // Analyze review patterns
    const recentReviews = reviews.filter(r => {
      const daysSince = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30; // Last 30 days
    });

    const reviewBurstRatio = recentReviews.length / reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingVariance = reviews.reduce((sum, r) => sum + Math.pow(r.rating - averageRating, 2), 0) / reviews.length;

    if (reviewBurstRatio > 0.5 && ratingVariance < 0.1) { // Sudden burst of uniform high ratings
      return {
        vendorId,
        anomalyType: 'review_inflation',
        severity: 'high',
        confidence: 0.8,
        evidence: [
          `Recent review burst: ${(reviewBurstRatio * 100).toFixed(1)}% in 30 days`,
          `Rating uniformity: variance ${(ratingVariance * 100).toFixed(1)}`,
          `Average rating: ${averageRating.toFixed(1)}`
        ],
        detectedAt: new Date(),
        recommendedAction: 'flag'
      };
    }

    return null;
  }

  // Trust decay detection
  detectTrustDecay(vendorId: number, historicalSignals: TrustSignal[]): TrustAnomaly | null {
    if (historicalSignals.length < 20) return null;

    // Calculate trust velocity (recent vs historical)
    const recentSignals = historicalSignals.filter(s => {
      const daysSince = (Date.now() - s.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7; // Last week
    });

    const olderSignals = historicalSignals.filter(s => {
      const daysSince = (Date.now() - s.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 7 && daysSince < 30; // Previous 3 weeks
    });

    if (recentSignals.length === 0 || olderSignals.length === 0) return null;

    const recentAvgValue = recentSignals.reduce((sum, s) => sum + s.value, 0) / recentSignals.length;
    const olderAvgValue = olderSignals.reduce((sum, s) => sum + s.value, 0) / olderSignals.length;

    const decayRatio = recentAvgValue / olderAvgValue;

    if (decayRatio < 0.3) { // Significant trust decay
      return {
        vendorId,
        anomalyType: 'trust_decay',
        severity: 'medium',
        confidence: 0.7,
        evidence: [
          `Trust decay: ${(decayRatio * 100).toFixed(1)}% of historical average`,
          `Recent signals: ${recentSignals.length}, Older signals: ${olderSignals.length}`,
          `Recent avg: ${recentAvgValue.toFixed(2)}, Older avg: ${olderAvgValue.toFixed(2)}`
        ],
        detectedAt: new Date(),
        recommendedAction: 'monitor'
      };
    }

    return null;
  }

  // Apply integrity adjustments to ranking
  applyIntegrityAdjustments(vendorId: number, baseRankScore: number): number {
    const vendorAnomalies = this.anomalies.get(vendorId) || [];
    let adjustedScore = baseRankScore;

    vendorAnomalies.forEach(anomaly => {
      switch (anomaly.recommendedAction) {
        case 'suppress':
          adjustedScore *= 0.3; // Heavy penalty
          break;
        case 'flag':
          adjustedScore *= 0.7; // Moderate penalty
          break;
        case 'monitor':
          adjustedScore *= 0.9; // Light penalty
          break;
      }
    });

    return Math.max(0, adjustedScore);
  }

  // Record and analyze trust signal
  async recordTrustSignal(signal: TrustSignal): Promise<void> {
    // Store signal for analysis
    await prisma.trustSignal.create({
      data: {
        vendorId: signal.vendorId,
        signalType: signal.signalType,
        value: signal.value,
        timestamp: signal.timestamp,
        source: signal.source,
        context: signal.context
      }
    });

    // Run anomaly detection
    await this.runAnomalyDetection(signal.vendorId);
  }

  private async runAnomalyDetection(vendorId: number): Promise<void> {
    // Get recent signals for analysis
    const recentSignals = await prisma.trustSignal.findMany({
      where: {
        vendorId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const anomalies: TrustAnomaly[] = [];

    // Run various anomaly detectors
    const clickSignals = recentSignals.filter(s => s.signalType === 'click');
    const clickAnomaly = this.detectClickFarming(vendorId, clickSignals);
    if (clickAnomaly) anomalies.push(clickAnomaly);

    const trustAnomaly = this.detectTrustDecay(vendorId, recentSignals);
    if (trustAnomaly) anomalies.push(trustAnomaly);

    // Store anomalies
    if (anomalies.length > 0) {
      this.anomalies.set(vendorId, anomalies);

      // Log critical anomalies
      anomalies.forEach(anomaly => {
        if (anomaly.severity === 'critical') {
          console.warn(`🚨 CRITICAL TRUST ANOMALY: ${anomaly.anomalyType} for vendor ${vendorId}`, anomaly);
        }
      });
    }
  }
}

// Global trust integrity engine
export const trustIntegrityEngine = TrustIntegrityEngine.getInstance();

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const districtMemory = DistrictMemoryLayer.getInstance();