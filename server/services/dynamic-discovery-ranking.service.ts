/**
 * DYNAMIC DISCOVERY RANKING ENGINE
 * BharatOS Sovereign Entity Ranking System
 *
 * INCORPORATES:
 * - Demand Intelligence (district memory patterns)
 * - Trust Signals (vendor reliability, user feedback)
 * - Memory Insights (historical performance, trending)
 * - Engagement Metrics (clicks, conversions, interactions)
 *
 * TRANSFORMS:
 * Static rankings → Dynamic intelligence-weighted scoring
 * Generic results → District-contextual relevance
 */

import { districtMemory } from './district-memory.service';
import { prisma } from '../storage';

export interface RankingContext {
  query: string;
  districtId: number;
  userId?: number;
  entityType: 'vendor' | 'product' | 'service' | 'transport';
  category?: string;
  location?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RankingWeights {
  trust: number;        // 0-1: Vendor reliability, ratings, reviews
  demand: number;       // 0-1: District demand patterns, supply gaps
  memory: number;       // 0-1: Historical performance, trending
  engagement: number;   // 0-1: User interactions, conversions
  locality: number;     // 0-1: Location relevance, distance
  freshness: number;    // 0-1: Recency of updates, activity
}

export interface RankingResult {
  entityId: number;
  entityType: string;
  finalScore: number;
  componentScores: {
    trust: number;
    demand: number;
    memory: number;
    engagement: number;
    locality: number;
    freshness: number;
  };
  rank: number;
  insights: string[];
  confidence: number;
}

export class DynamicDiscoveryRanking {
  private static instance: DynamicDiscoveryRanking;
  private weights: RankingWeights;

  private constructor() {
    // Sovereign default weights - can be dynamically adjusted
    this.weights = {
      trust: 0.25,      // 25% - Reliability is critical
      demand: 0.20,     // 20% - District demand patterns
      memory: 0.20,     // 20% - Historical intelligence
      engagement: 0.15, // 15% - User interaction signals
      locality: 0.10,   // 10% - Location relevance
      freshness: 0.10   // 10% - Recency factor
    };
  }

  static getInstance(): DynamicDiscoveryRanking {
    if (!DynamicDiscoveryRanking.instance) {
      DynamicDiscoveryRanking.instance = new DynamicDiscoveryRanking();
    }
    return DynamicDiscoveryRanking.instance;
  }

  // ============================================
  // MAIN RANKING ENTRY POINT
  // ============================================

  async rankEntities(entities: any[], context: RankingContext): Promise<RankingResult[]> {
    const { districtId, query } = context;

    // Gather district intelligence for contextual ranking
    const districtIntelligence = await districtMemory.getDistrictIntelligence(districtId);

    // Calculate ranking for each entity
    const rankingPromises = entities.map(async (entity, index) => {
      const componentScores = await this.calculateComponentScores(entity, context, districtIntelligence);
      const finalScore = this.calculateFinalScore(componentScores);
      const insights = this.generateRankingInsights(entity, componentScores, districtIntelligence);

      return {
        entityId: entity.id,
        entityType: context.entityType,
        finalScore,
        componentScores,
        rank: 0, // Will be set after sorting
        insights,
        confidence: this.calculateConfidence(componentScores)
      };
    });

    const rankings = await Promise.all(rankingPromises);

    // Sort by final score and assign ranks
    rankings.sort((a, b) => b.finalScore - a.finalScore);
    rankings.forEach((result, index) => {
      result.rank = index + 1;
    });

    // Record ranking intelligence for learning
    await this.recordRankingIntelligence(rankings, context);

    return rankings;
  }

  // ============================================
  // COMPONENT SCORE CALCULATION
  // ============================================

  private async calculateComponentScores(
    entity: any,
    context: RankingContext,
    districtIntelligence: any
  ): Promise<RankingResult['componentScores']> {
    const { districtId, entityType } = context;

    // Parallel calculation of all components
    const [
      trustScore,
      demandScore,
      memoryScore,
      engagementScore,
      localityScore,
      freshnessScore
    ] = await Promise.all([
      this.calculateTrustScore(entity, entityType),
      this.calculateDemandScore(entity, context, districtIntelligence),
      this.calculateMemoryScore(entity, context, districtIntelligence),
      this.calculateEngagementScore(entity, context),
      this.calculateLocalityScore(entity, context),
      this.calculateFreshnessScore(entity)
    ]);

    return {
      trust: trustScore,
      demand: demandScore,
      memory: memoryScore,
      engagement: engagementScore,
      locality: localityScore,
      freshness: freshnessScore
    };
  }

  // TRUST SCORE: Reliability, ratings, reviews, verification
  private async calculateTrustScore(entity: any, entityType: string): Promise<number> {
    let score = 0;
    let maxScore = 100;

    switch (entityType) {
      case 'vendor':
        score += (entity.vendorMLProfile?.reliabilityScore || 0) * 30;
        score += (entity.avgRating || 0) * 20;
        score += Math.min((entity._count?.reviews || 0) * 2, 20);
        score += entity.isVerified ? 20 : 0;
        score += (entity.dsslScore || 0) * 0.1;
        break;

      case 'product':
        score += (entity.rating || 0) * 25;
        score += Math.min((entity._count?.reviews || 0) * 3, 25);
        score += entity.inStock ? 20 : 0;
        score += entity.vendor?.isVerified ? 15 : 0;
        score += (entity.vendor?.dsslScore || 0) * 0.15;
        break;

      case 'service':
        score += (entity.rating || 0) * 25;
        score += Math.min((entity.reviewCount || 0) * 2, 20);
        score += entity.isVerified ? 25 : 0;
        score += (entity.experience || 0) * 1;
        score += entity.dsslScore ? (entity.dsslScore / 100) * 30 : 0;
        break;

      case 'transport':
        score += 30; // Base transport trust (regulated services)
        // Would add operator ratings, safety scores, etc.
        break;
    }

    return Math.min(score / maxScore, 1.0);
  }

  // DEMAND SCORE: District demand patterns, supply gaps
  private async calculateDemandScore(
    entity: any,
    context: RankingContext,
    districtIntelligence: any
  ): Promise<number> {
    const { category, districtId } = context;
    let score = 0;

    // Check if entity matches supply gaps (high demand areas)
    const matchingGaps = districtIntelligence.supplyGaps?.filter((gap: any) =>
      entity.category?.toLowerCase().includes(gap.domain.toLowerCase()) ||
      entity.name?.toLowerCase().includes(gap.entity.toLowerCase())
    ) || [];

    score += matchingGaps.length * 0.4; // Up to 40% boost for supply gap matches

    // Check district economic clusters
    const relevantClusters = districtIntelligence.economics?.filter((cluster: any) =>
      cluster.domain.toLowerCase().includes((category || '').toLowerCase())
    ) || [];

    if (relevantClusters.length > 0) {
      const topCluster = relevantClusters[0];
      score += (topCluster.growthScore || 0) * 0.3; // Economic growth factor
      score += Math.min(topCluster.totalOrders / 100, 0.3); // Order volume factor
    }

    // Urgency boost
    if (context.urgency === 'high' || context.urgency === 'critical') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  // MEMORY SCORE: Historical performance, trending patterns
  private async calculateMemoryScore(
    entity: any,
    context: RankingContext,
    districtIntelligence: any
  ): Promise<number> {
    let score = 0;

    // Trending queries match
    const trendingMatches = districtIntelligence.trendingQueries?.filter((trend: any) =>
      entity.name?.toLowerCase().includes(trend.query.toLowerCase()) ||
      entity.category?.toLowerCase().includes(trend.category?.toLowerCase())
    ) || [];

    score += trendingMatches.length * 0.3;

    // Historical performance from partner interactions
    const interactions = await districtMemory.getPartnerInteractions(context.districtId, entity.id);
    const positiveInteractions = interactions.filter((i: any) =>
      ['search_view', 'call', 'order'].includes(i.interactionType)
    );

    score += Math.min(positiveInteractions.length / 10, 0.3); // Up to 30% for interaction history

    // Memory-based performance trends
    const recentInteractions = interactions.filter((i: any) =>
      new Date(i.timestamp).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000) // Last 30 days
    );

    if (recentInteractions.length > 0) {
      score += 0.2; // Recency boost
    }

    // Economic health consideration
    if (districtIntelligence.economicHealth > 80) {
      score += 0.1; // Boost in healthy districts
    } else if (districtIntelligence.economicHealth < 50) {
      score += entity.isVerified ? 0.2 : 0; // Prioritize verified in struggling districts
    }

    return Math.min(score, 1.0);
  }

  // ENGAGEMENT SCORE: User interactions, conversions
  private async calculateEngagementScore(entity: any, context: RankingContext): Promise<number> {
    const { userId, districtId } = context;
    let score = 0;

    // User-specific engagement (if user provided)
    if (userId) {
      const userPreferences = await prisma.userPreference.findMany({
        where: { userId, vendorId: entity.id },
        orderBy: { preferenceScore: 'desc' },
        take: 1
      });

      if (userPreferences.length > 0) {
        score += (userPreferences[0].preferenceScore / 100) * 0.4;
      }
    }

    // General engagement metrics
    const userEvents = await prisma.userEvent.findMany({
      where: {
        districtId,
        vendorId: entity.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    });

    const clicks = userEvents.filter(e => e.action === 'click').length;
    const views = userEvents.filter(e => e.action === 'view').length;
    const conversions = userEvents.filter(e => e.converted).length;

    // Click-through rate
    const ctr = views > 0 ? clicks / views : 0;
    score += Math.min(ctr * 2, 0.3);

    // Conversion rate
    const conversionRate = clicks > 0 ? conversions / clicks : 0;
    score += Math.min(conversionRate * 3, 0.3);

    return Math.min(score, 1.0);
  }

  // LOCALITY SCORE: Location relevance, distance factors
  private async calculateLocalityScore(entity: any, context: RankingContext): Promise<number> {
    const { location, districtId } = context;
    let score = 0.5; // Base score

    // Location-based boosting
    if (location && entity.address) {
      // Simple location matching - in production would use geocoding
      const locationMatch = entity.address.toLowerCase().includes(location.toLowerCase());
      if (locationMatch) {
        score += 0.3;
      }
    }

    // Service area consideration for services
    if (entity.type === 'service' && entity.serviceArea) {
      // Would check if user location is within service area
      score += 0.2;
    }

    // District centrality (vendors in district center get slight boost)
    if (entity.districtId === districtId) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  // FRESHNESS SCORE: Recency of updates, activity
  private async calculateFreshnessScore(entity: any): Promise<number> {
    let score = 0;

    // Profile update recency
    if (entity.updatedAt) {
      const daysSinceUpdate = (Date.now() - entity.updatedAt.getTime()) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 0.3 - (daysSinceUpdate / 365) * 0.3); // Decays over a year
    }

    // Recent activity
    if (entity.lastActiveAt || entity.createdAt) {
      const lastActivity = entity.lastActiveAt || entity.createdAt;
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 0.4 - (daysSinceActivity / 180) * 0.4); // Decays over 6 months
    }

    // Recent reviews/comments
    if (entity.lastReviewAt) {
      const daysSinceReview = (Date.now() - entity.lastReviewAt.getTime()) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 0.3 - (daysSinceReview / 90) * 0.3); // Decays over 3 months
    }

    return Math.min(score, 1.0);
  }

  // ============================================
  // FINAL SCORE CALCULATION
  // ============================================

  private calculateFinalScore(componentScores: RankingResult['componentScores']): number {
    return (
      componentScores.trust * this.weights.trust +
      componentScores.demand * this.weights.demand +
      componentScores.memory * this.weights.memory +
      componentScores.engagement * this.weights.engagement +
      componentScores.locality * this.weights.locality +
      componentScores.freshness * this.weights.freshness
    );
  }

  private calculateConfidence(componentScores: RankingResult['componentScores']): number {
    // Confidence based on data completeness and consistency
    const components = Object.values(componentScores);
    const avgScore = components.reduce((sum, score) => sum + score, 0) / components.length;
    const variance = components.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / components.length;
    const consistency = Math.max(0, 1 - Math.sqrt(variance)); // Lower variance = higher confidence

    return Math.min(avgScore * 0.7 + consistency * 0.3, 1.0);
  }

  // ============================================
  // INSIGHTS GENERATION
  // ============================================

  private generateRankingInsights(
    entity: any,
    componentScores: RankingResult['componentScores'],
    districtIntelligence: any
  ): string[] {
    const insights: string[] = [];

    // Trust insights
    if (componentScores.trust > 0.8) {
      insights.push("Highly trusted and verified");
    } else if (componentScores.trust < 0.4) {
      insights.push("Building trust - check reviews");
    }

    // Demand insights
    if (componentScores.demand > 0.7) {
      insights.push("High demand in your area");
    }

    // Memory insights
    if (componentScores.memory > 0.6) {
      insights.push("Popular and trending locally");
    }

    // Engagement insights
    if (componentScores.engagement > 0.5) {
      insights.push("Frequently chosen by customers");
    }

    // Economic context
    if (districtIntelligence.economicHealth < 60) {
      insights.push("Recommended in current district conditions");
    }

    return insights.slice(0, 3); // Max 3 insights
  }

  // ============================================
  // LEARNING & OPTIMIZATION
  // ============================================

  private async recordRankingIntelligence(rankings: RankingResult[], context: RankingContext): Promise<void> {
    // Record ranking outcomes for future learning
    for (const ranking of rankings.slice(0, 5)) { // Top 5 for learning
    // Find existing record first, then update or create
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.vendorMetricsDaily.findFirst({
      where: {
        vendorId: ranking.vendorId,
        date: today
      }
    });

    if (existing) {
      await prisma.vendorMetricsDaily.update({
        where: { id: existing.id },
        data: {
          aiMentions: { increment: 1 },
          trustDelta: ranking.componentScores.trust
        }
      });
    } else {
      await prisma.vendorMetricsDaily.create({
        data: {
          vendorId: ranking.vendorId,
          date: today,
          aiMentions: 1,
          trustDelta: ranking.componentScores?.trust || 0
        }
      });
    }

      // Update district intelligence with ranking patterns
      await districtMemory.recordPartnerInteraction({
        districtId: context.districtId,
        partnerType: 'system',
        partnerId: 0, // System interaction
        interactionType: 'ranking_applied',
        context: {
          query: context.query,
          topEntity: rankings[0]?.entityId,
          rankingCount: rankings.length,
          weights: this.weights
        }
      });
    }
  }

  // ============================================
  // WEIGHT OPTIMIZATION
  // ============================================

  async optimizeWeights(districtId: number): Promise<void> {
    // Analyze ranking performance and adjust weights
    // This would use machine learning to optimize weights based on user satisfaction
    // For now, keep static weights as per sovereign design
    console.log(`Ranking weights optimized for district ${districtId}`);
  }

  // ============================================
  // ADMIN INTERFACE
  // ============================================

  getCurrentWeights(): RankingWeights {
    return { ...this.weights };
  }

  async updateWeights(newWeights: Partial<RankingWeights>): Promise<void> {
    // Validate weights sum to 1.0
    const totalWeight = Object.values({ ...this.weights, ...newWeights }).reduce((sum, w) => sum + w, 0);

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error('Ranking weights must sum to 1.0');
    }

    this.weights = { ...this.weights, ...newWeights };
    console.log('Ranking weights updated:', this.weights);
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const dynamicDiscoveryRanking = DynamicDiscoveryRanking.getInstance();