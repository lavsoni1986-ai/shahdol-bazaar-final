/**
 * TELEMETRY SERVICE
 * Single authoritative truth creation for cognition pipeline
 */

import { prisma } from '../storage';
import { districtMemory } from './district-memory.service';

export interface TelemetryTruth {
  truthId: string;
  timestamp: Date;
  query: QueryTruth;
  intelligence: IntelligenceTruth;
  results: ResultsTruth;
  response: ResponseTruth;
  metadata: TelemetryMetadata;
}

export interface QueryTruth {
  original: string;
  parsed: any;
  intent: any;
  confidence: number;
  searchTerms: string[];
  // Resolved semantic category added for Phase 1C-A (electronics.store / electronics.repair)
  resolvedCategory?: string; // e.g. 'electronics.store' | 'electronics.repair' | 'electronics.ambiguous'
  resolvedSemanticType?: string; // e.g. 'COMMERCE' | 'SERVICE' | 'AMBIGUOUS'
}

export interface IntelligenceTruth {
  districtId: number;
  economicHealth: number;
  supplyGaps: any[];
  trendingQueries: any[];
  activeSignals: any[];
  clusters: any[];
}

export interface ResultsTruth {
  entities: any[];
  totalFound: number;
  rankingApplied: boolean;
  validationPassed: boolean;
  confidence: number;
  economicContext: any;
}

export interface ResponseTruth {
  answer: string;
  confidence: number;
  followUp?: string[];
  recommendations: any[];
  generationTime: number;
}

export interface TelemetryMetadata {
  pipelineVersion: string;
  processingSteps: string[];
  performanceMetrics: any;
  errors: any[];
  userId?: number;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private readonly PIPELINE_VERSION = '1.0.0';

  private constructor() {}

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  async createTelemetryTruth(params: {
    query: QueryTruth;
    intelligence: IntelligenceTruth;
    results: ResultsTruth;
    response: ResponseTruth;
    userId?: number;
    processingSteps?: string[];
    performanceMetrics?: any;
    errors?: any[];
  }): Promise<TelemetryTruth> {
    const truthId = this.generateTruthId();
    const timestamp = new Date();

    const telemetryTruth: TelemetryTruth = {
      truthId,
      timestamp,
    query: params.query,
    intelligence: params.intelligence,
    results: params.results,
    response: params.response,
    metadata: {
      pipelineVersion: this.PIPELINE_VERSION,
      processingSteps: params.processingSteps || [],
      performanceMetrics: params.performanceMetrics || {},
      errors: params.errors || [],
      userId: params.userId,
      // Preserve backward compatibility: resolved tags are optional and will be added if present in params.query or inferred below
      resolvedCategory: params.query?.resolvedCategory || null,
      resolvedSemanticType: params.query?.resolvedSemanticType || null
    }
  };

  // Add additive resolved semantic tagging for electronics split (non-breaking)
  // If upstream provided resolvedCategory in params.query, preserve it; otherwise infer heuristically from searchTerms
  if (!telemetryTruth.query.resolvedCategory) {
    const lowerTerms = telemetryTruth.query.searchTerms.join(' ').toLowerCase();
    const repairTokens = ['repair','fix','broken','service center','repair shop','screen','battery','replacement','not working'];
    const commerceTokens = ['buy','shop','showroom','store','price','sell','dealer','buying','purchase'];
    const hasRepair = repairTokens.some(t => lowerTerms.includes(t));
    const hasCommerce = commerceTokens.some(t => lowerTerms.includes(t));
    if (hasRepair && !hasCommerce) {
      telemetryTruth.query.resolvedCategory = 'electronics.repair';
      telemetryTruth.query.resolvedSemanticType = 'SERVICE';
    } else if (hasCommerce && !hasRepair) {
      telemetryTruth.query.resolvedCategory = 'electronics.store';
      telemetryTruth.query.resolvedSemanticType = 'COMMERCE';
    } else if (lowerTerms.includes('electronics')) {
      telemetryTruth.query.resolvedCategory = 'electronics.ambiguous';
      telemetryTruth.query.resolvedSemanticType = 'AMBIGUOUS';
    }
  }

    // Store the authoritative truth
    await this.storeTruth(telemetryTruth);

    // Update district memory with telemetry insights
    await this.updateDistrictMemory(telemetryTruth);

    // Record user interaction if user present
    if (params.userId) {
      await this.recordUserInteraction(telemetryTruth);
    }

    return telemetryTruth;
  }

  private generateTruthId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `truth_${timestamp}_${random}`;
  }

  private async storeTruth(truth: TelemetryTruth): Promise<void> {
    try {
      // Store in telemetry truth table (assuming it exists)
      await prisma.telemetryTruth.create({
        data: {
          truthId: truth.truthId,
          timestamp: truth.timestamp,
          districtId: truth.intelligence.districtId,
          userId: truth.metadata.userId,
          queryOriginal: truth.query.original,
          queryParsed: truth.query.parsed,
          queryIntent: truth.query.intent,
          queryConfidence: truth.query.confidence,
          searchTerms: truth.query.searchTerms,
          economicHealth: truth.intelligence.economicHealth,
          supplyGaps: truth.intelligence.supplyGaps,
          trendingQueries: truth.intelligence.trendingQueries,
          activeSignals: truth.intelligence.activeSignals,
          economicClusters: truth.intelligence.clusters,
          resultsEntities: truth.results.entities,
          resultsTotalFound: truth.results.totalFound,
          resultsRankingApplied: truth.results.rankingApplied,
          resultsValidationPassed: truth.results.validationPassed,
          resultsConfidence: truth.results.confidence,
          resultsEconomicContext: truth.results.economicContext,
          responseAnswer: truth.response.answer,
          responseConfidence: truth.response.confidence,
          responseFollowUp: truth.response.followUp,
          responseRecommendations: truth.response.recommendations,
          responseGenerationTime: truth.response.generationTime,
          pipelineVersion: truth.metadata.pipelineVersion,
          processingSteps: truth.metadata.processingSteps,
          performanceMetrics: truth.metadata.performanceMetrics,
          errors: truth.metadata.errors,
          // New additive fields for resolved semantic telemetry (Phase 1C-A)
          resolvedCategory: truth.query.resolvedCategory || null,
          resolvedSemanticType: truth.query.resolvedSemanticType || null
        }
      });
    } catch (error) {
      console.warn('Failed to store telemetry truth:', error);
      // Don't throw - telemetry failure shouldn't break the pipeline
    }
  }

  private async updateDistrictMemory(truth: TelemetryTruth): Promise<void> {
    try {
      // Record demand signal
      await districtMemory.recordDemand({
        districtId: truth.intelligence.districtId,
        query: truth.query.original,
        domain: this.extractDomainFromQuery(truth.query),
        entity: 'search',
        intent: truth.query.intent?.primary || 'discovery',
        confidence: truth.query.confidence,
        resultsCount: truth.results.totalFound,
        userId: truth.metadata.userId
      });

      // Record partner interactions for top results
      const topEntities = truth.results.entities.slice(0, 5);
      for (const entity of topEntities) {
        if (entity.type === 'vendor' && entity.id) {
          await districtMemory.recordPartnerInteraction({
            districtId: truth.intelligence.districtId,
            partnerType: 'vendor',
            partnerId: entity.id,
            interactionType: 'search_result',
            context: {
              query: truth.query.original,
              position: truth.results.entities.indexOf(entity) + 1,
              relevanceScore: entity.relevanceScore,
              trustScore: entity.rankingFactors?.trustScore
            },
            userId: truth.metadata.userId
          });
        }
      }

      // Update query success metrics
      await this.updateQueryMetrics(truth);

    } catch (error) {
      console.warn('Failed to update district memory:', error);
    }
  }

  private async recordUserInteraction(truth: TelemetryTruth): Promise<void> {
    if (!truth.metadata.userId) return;

    try {
      await prisma.userEvent.create({
        data: {
          userId: truth.metadata.userId,
          districtId: truth.intelligence.districtId,
          action: 'ai_concierge_search',
          meta: {
            truthId: truth.truthId,
            query: truth.query.original,
            resultsFound: truth.results.totalFound,
            confidence: truth.response.confidence,
            intent: truth.query.intent?.primary,
            entities: truth.results.entities.map(e => ({
              id: e.id,
              type: e.type,
              name: e.name,
              relevanceScore: e.relevanceScore
            }))
          },
          queryText: truth.query.original,
          parsedIntent: truth.query.intent?.primary || 'discovery',
          matchedVendorIds: truth.results.entities
            .filter(e => e.type === 'vendor')
            .map(e => e.id)
            .slice(0, 5),
          converted: false // Will be updated later if user takes action
        }
      });
    } catch (error) {
      console.warn('Failed to record user interaction:', error);
    }
  }

  private extractDomainFromQuery(query: QueryTruth): string {
    // Extract domain from query terms and intent
    const searchTerms = query.searchTerms.join(' ').toLowerCase();

    const domains = [
      { pattern: /\b(food|restaurant|cafe|hotel|eatery)\b/, domain: 'food' },
      { pattern: /\b(doctor|hospital|clinic|medical|pharmacy)\b/, domain: 'medical' },
      { pattern: /\b(school|college|tutor|teacher|coaching)\b/, domain: 'education' },
      { pattern: /\b(car|bike|mechanic|garage|auto)\b/, domain: 'automotive' },
      { pattern: /\b(phone|mobile|laptop|computer|electronics)\b/, domain: 'electronics' },
      { pattern: /\b(electrician|plumber|carpenter|mechanic)\b/, domain: 'services' },
      { pattern: /\b(bus|train|taxi|auto|rickshaw)\b/, domain: 'transport' }
    ];

    for (const { pattern, domain } of domains) {
      if (pattern.test(searchTerms)) {
        return domain;
      }
    }

    return 'general';
  }

  private async updateQueryMetrics(truth: TelemetryTruth): Promise<void> {
    try {
      // Update query performance metrics
      const metrics = {
        districtId: truth.intelligence.districtId,
        query: truth.query.original,
        intent: truth.query.intent?.primary,
        confidence: truth.query.confidence,
        resultsCount: truth.results.totalFound,
        responseTime: truth.metadata.performanceMetrics?.totalTime || 0,
        success: truth.results.validationPassed,
        userId: truth.metadata.userId
      };

      await districtMemory.updateQueryMetrics(metrics);
    } catch (error) {
      console.warn('Failed to update query metrics:', error);
    }
  }

  // Truth verification methods
  async verifyTruth(truthId: string): Promise<boolean> {
    try {
      const truth = await prisma.telemetryTruth.findUnique({
        where: { truthId }
      });

      if (!truth) return false;

      // Verify data integrity
      return this.verifyDataIntegrity(truth);
    } catch (error) {
      console.warn('Truth verification failed:', error);
      return false;
    }
  }

  async getTruthById(truthId: string): Promise<TelemetryTruth | null> {
    try {
      const truth = await prisma.telemetryTruth.findUnique({
        where: { truthId }
      });

      if (!truth) return null;

      return this.reconstructTruth(truth);
    } catch (error) {
      console.warn('Failed to retrieve truth:', error);
      return null;
    }
  }

  async getTruthsByQuery(query: string, districtId: number, limit = 10): Promise<TelemetryTruth[]> {
    try {
      const truths = await prisma.telemetryTruth.findMany({
        where: {
          districtId,
          queryOriginal: { contains: query }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return truths.map(t => this.reconstructTruth(t));
    } catch (error) {
      console.warn('Failed to retrieve truths by query:', error);
      return [];
    }
  }

  private verifyDataIntegrity(truth: any): boolean {
    // Check required fields
    if (!truth.truthId || !truth.timestamp || !truth.districtId) return false;

    // Check confidence ranges
    if (truth.queryConfidence < 0 || truth.queryConfidence > 1) return false;
    if (truth.resultsConfidence < 0 || truth.resultsConfidence > 1) return false;
    if (truth.responseConfidence < 0 || truth.responseConfidence > 1) return false;

    // Check result counts
    if (truth.resultsTotalFound < 0) return false;

    return true;
  }

  private reconstructTruth(dbTruth: any): TelemetryTruth {
    return {
      truthId: dbTruth.truthId,
      timestamp: dbTruth.timestamp,
      query: {
        original: dbTruth.queryOriginal,
        parsed: dbTruth.queryParsed,
        intent: dbTruth.queryIntent,
        confidence: dbTruth.queryConfidence,
        searchTerms: dbTruth.searchTerms
      },
      intelligence: {
        districtId: dbTruth.districtId,
        economicHealth: dbTruth.economicHealth,
        supplyGaps: dbTruth.supplyGaps,
        trendingQueries: dbTruth.trendingQueries,
        activeSignals: dbTruth.activeSignals,
        clusters: dbTruth.economicClusters
      },
      results: {
        entities: dbTruth.resultsEntities,
        totalFound: dbTruth.resultsTotalFound,
        rankingApplied: dbTruth.resultsRankingApplied,
        validationPassed: dbTruth.resultsValidationPassed,
        confidence: dbTruth.resultsConfidence,
        economicContext: dbTruth.resultsEconomicContext
      },
      response: {
        answer: dbTruth.responseAnswer,
        confidence: dbTruth.responseConfidence,
        followUp: dbTruth.responseFollowUp,
        recommendations: dbTruth.responseRecommendations,
        generationTime: dbTruth.responseGenerationTime
      },
      metadata: {
        pipelineVersion: dbTruth.pipelineVersion,
        processingSteps: dbTruth.processingSteps,
        performanceMetrics: dbTruth.performanceMetrics,
        errors: dbTruth.errors,
        userId: dbTruth.userId,
        resolvedCategory: dbTruth.resolvedCategory || null,
        resolvedSemanticType: dbTruth.resolvedSemanticType || null
      }
    };
  }
}

export const telemetryService = TelemetryService.getInstance();