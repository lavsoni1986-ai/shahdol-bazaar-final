/**
 * RELEVANCE RANKING ENGINE
 * Multi-factor relevance ranking for cognition pipeline
 */

import { districtMemory } from './district-memory.service';

export interface RankedEntity extends Entity {
  relevanceScore: number;
  rankingFactors: RankingFactors;
  finalScore: number;
}

export interface Entity {
  id: number;
  type: 'vendor' | 'product' | 'service' | 'transport';
  name: string;
  category: string;
  [key: string]: any;
}

export interface RankingFactors {
  trustScore: number;
  popularityScore: number;
  relevanceScore: number;
  memoryScore: number;
  locationScore: number;
  availabilityScore: number;
  recencyScore: number;
}

export interface CognitionContext {
  searchTerms: string[];
  intent: any;
  context: any;
  districtIntelligence: any;
}

export class RelevanceRankingEngine {
  private static instance: RelevanceRankingEngine;

  private constructor() {}

  static getInstance(): RelevanceRankingEngine {
    if (!RelevanceRankingEngine.instance) {
      RelevanceRankingEngine.instance = new RelevanceRankingEngine();
    }
    return RelevanceRankingEngine.instance;
  }

  async calculateRelevanceScore(
    entity: Entity,
    searchTerms: string[],
    cognition: CognitionContext
  ): Promise<RankedEntity> {
    // Calculate individual ranking factors
    const factors = await this.calculateRankingFactors(entity, searchTerms, cognition);

    // Weighted combination
    const finalScore = this.combineFactors(factors);

    return {
      ...entity,
      relevanceScore: finalScore,
      rankingFactors: factors,
      finalScore
    };
  }

  private async calculateRankingFactors(
    entity: Entity,
    searchTerms: string[],
    cognition: CognitionContext
  ): Promise<RankingFactors> {
    // Trust and quality score
    const trustScore = this.calculateTrustScore(entity);

    // Popularity and engagement score
    const popularityScore = this.calculatePopularityScore(entity);

    // Text relevance to search terms
    const relevanceScore = this.calculateTextRelevance(entity, searchTerms);

    // Memory and district intelligence score
    const memoryScore = await this.calculateMemoryScore(entity, cognition);

    // Location relevance score
    const locationScore = this.calculateLocationScore(entity, cognition);

    // Availability score
    const availabilityScore = this.calculateAvailabilityScore(entity);

    // Recency and freshness score
    const recencyScore = this.calculateRecencyScore(entity);

    return {
      trustScore,
      popularityScore,
      relevanceScore,
      memoryScore,
      locationScore,
      availabilityScore,
      recencyScore
    };
  }

  private calculateTrustScore(entity: Entity): number {
    let score = 0;

    // Base trust factors
    score += (entity.trustScore || 0) * 0.4;
    score += (entity.rating || 0) * 0.3;
    score += (entity.reviewCount || 0) * 0.0005; // Diminishing returns
    score += entity.isVerified ? 0.3 : 0;

    // Type-specific trust adjustments
    switch (entity.type) {
      case 'vendor':
        score += (entity.orderCount || 0) * 0.0002;
        break;
      case 'service':
        score += (entity.experience || 0) * 0.001;
        break;
      case 'product':
        // Products get trust from vendor reputation
        score += entity.inStock ? 0.1 : 0;
        break;
    }

    return Math.min(score, 1.0);
  }

  private calculatePopularityScore(entity: Entity): number {
    let score = 0;

    // Review and rating popularity
    score += Math.min((entity.reviewCount || 0) / 100, 1.0) * 0.5;

    // Type-specific popularity metrics
    switch (entity.type) {
      case 'vendor':
        score += Math.min((entity.orderCount || 0) / 1000, 1.0) * 0.3;
        break;
      case 'product':
        // Products get popularity from rating and stock status
        score += (entity.rating || 0) * 0.3;
        score += entity.inStock ? 0.2 : 0;
        break;
      case 'service':
        score += (entity.rating || 0) * 0.3;
        break;
      case 'transport':
        // Transport popularity based on schedule frequency
        score += 0.2;
        break;
    }

    return Math.min(score, 1.0);
  }

  private calculateTextRelevance(entity: Entity, searchTerms: string[]): number {
    let score = 0;
    const searchableText = this.getEntitySearchableText(entity).toLowerCase();

    // Exact term matches
    const exactMatches = searchTerms.filter(term =>
      searchableText.includes(term.toLowerCase())
    ).length;

    // Partial matches
    const partialMatches = searchTerms.filter(term => {
      const termLower = term.toLowerCase();
      return searchableText.split(/\s+/).some(word =>
        word.includes(termLower) || termLower.includes(word)
      );
    }).length;

    // Fuzzy matches for typos
    const fuzzyMatches = searchTerms.filter(term => {
      const termLower = term.toLowerCase();
      return searchableText.split(/\s+/).some(word =>
        this.levenshteinDistance(word, termLower) <= 2
      );
    }).length;

    // Scoring: exact > partial > fuzzy
    score += exactMatches * 0.4;
    score += (partialMatches - exactMatches) * 0.2;
    score += (fuzzyMatches - partialMatches) * 0.1;

    // Category relevance bonus
    if (searchTerms.some(term => entity.category?.toLowerCase().includes(term.toLowerCase()))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private async calculateMemoryScore(entity: Entity, cognition: CognitionContext): Promise<number> {
    let score = 0;

    try {
      const districtIntelligence = cognition.districtIntelligence;

      // Trending queries boost
      if (districtIntelligence?.memory?.trendingQueries) {
        const trendingMatches = districtIntelligence.memory.trendingQueries.filter((t: any) =>
          entity.name?.toLowerCase().includes(t.query.toLowerCase()) ||
          entity.category?.toLowerCase().includes(t.category?.toLowerCase())
        ).length;
        score += trendingMatches * 0.3;
      }

      // Supply gap relevance (high demand areas)
      if (districtIntelligence?.memory?.supplyGaps) {
        const gapMatches = districtIntelligence.memory.supplyGaps.filter((g: any) =>
          entity.category?.toLowerCase().includes(g.domain.toLowerCase())
        ).length;
        score += gapMatches * 0.4;
      }

      // Economic opportunity boost
      if (districtIntelligence?.economics) {
        const opportunityMatches = districtIntelligence.economics.filter((c: any) =>
          c.growthScore > 0.7 &&
          entity.category?.toLowerCase().includes(c.domain.toLowerCase())
        ).length;
        score += opportunityMatches * 0.2;
      }

      // Recent interactions boost
      if (entity.id) {
        const recentActivity = await this.getRecentEntityActivity(entity.id, entity.type);
        score += recentActivity * 0.1;
      }

    } catch (error) {
      // Memory calculation failed, continue with 0
      console.warn('Memory score calculation failed:', error);
    }

    return Math.min(score, 1.0);
  }

  private calculateLocationScore(entity: Entity, cognition: CognitionContext): number {
    let score = 1.0; // Default full score if no location context

    if (cognition.context?.location) {
      const queryLocation = cognition.context.location.toLowerCase();

      // Check if entity has location information
      const entityLocation = entity.address || entity.serviceArea || entity.locality || '';
      if (entityLocation) {
        const entityLocationLower = entityLocation.toLowerCase();

        // Exact location match
        if (entityLocationLower.includes(queryLocation)) {
          score = 1.0;
        }
        // Nearby location indicators
        else if (/\b(near|nearby|close|adjacent)\b/.test(queryLocation)) {
          score = 0.8;
        }
        // Different location
        else {
          score = 0.3;
        }
      }
    }

    return score;
  }

  private calculateAvailabilityScore(entity: Entity): number {
    let score = 1.0; // Default available

    switch (entity.type) {
      case 'vendor':
        score = entity.isActive !== false ? 1.0 : 0.0;
        break;
      case 'product':
        score = entity.inStock ? 1.0 : 0.2;
        break;
      case 'service':
        score = entity.isAvailable ? 1.0 : 0.0;
        break;
      case 'transport':
        score = entity.isActive ? 1.0 : 0.0;
        break;
    }

    return score;
  }

  private calculateRecencyScore(entity: Entity): number {
    let score = 0.5; // Default neutral score

    // Check for recency indicators
    if (entity.updatedAt || entity.lastActive || entity.createdAt) {
      const lastUpdate = new Date(entity.updatedAt || entity.lastActive || entity.createdAt);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      // Very recent (last 24 hours)
      if (daysSinceUpdate < 1) score = 1.0;
      // Recent (last week)
      else if (daysSinceUpdate < 7) score = 0.9;
      // This month
      else if (daysSinceUpdate < 30) score = 0.7;
      // Older
      else score = 0.4;
    }

    return score;
  }

  private combineFactors(factors: RankingFactors): number {
    // Weighted combination of factors
    const weights = {
      trustScore: 0.25,
      popularityScore: 0.15,
      relevanceScore: 0.30,
      memoryScore: 0.15,
      locationScore: 0.10,
      availabilityScore: 0.20,
      recencyScore: 0.05
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      const factorValue = factors[factor as keyof RankingFactors];
      if (typeof factorValue === 'number' && !isNaN(factorValue)) {
        totalScore += factorValue * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  private getEntitySearchableText(entity: Entity): string {
    return [
      entity.name,
      entity.category,
      entity.description,
      entity.businessType,
      entity.address,
      entity.city,
      entity.serviceArea,
      entity.locality
    ].filter(Boolean).join(' ');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
    return matrix[b.length][a.length];
  }

  private async getRecentEntityActivity(entityId: number, entityType: string): Promise<number> {
    // Simplified - in real implementation would check recent interactions
    // from district memory or database
    return 0.5;
  }
}

export const relevanceRankingEngine = RelevanceRankingEngine.getInstance();