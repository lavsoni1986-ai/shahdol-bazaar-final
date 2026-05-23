/**
 * AI GROUNDED CONCIERGE
 * BharatOS Sovereign District Cognition System
 *
 * INTEGRATES:
 * - AI Provider Authority (cognitive routing)
 * - District Memory Layer (demand/supply intelligence)
 * - Economic Graph (vendor relationships, trust scores)
 * - Discovery Engine (real-time search & ranking)
 *
 * PURPOSE:
 * Transform generic AI responses into district-grounded intelligence
 * "best electrician near bus stand" → real entities, trust-ranked, district-aware
 */

import { aiProviderManager, AIProvider } from '../ai/provider-manager';
import { districtMemory, getUnifiedGroundingIndex } from './district-memory.service';
import { prisma } from '../storage';
import { classifyConversationalIntent } from '../lib/humanization';

export interface GroundedConciergeRequest {
  query: string;
  districtId: number;
  userId?: number;
  context?: {
    location?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    preferences?: string[];
  };
}

export interface GroundedConciergeResponse {
  answer: string;
  results: any[];
  confidence: number;
  grounding: {
    districtIntelligence: any;
    economicContext: any;
    memoryInsights: any;
  };
  recommendations: any[];
  followUp?: string[];
  conversational?: boolean; // Flag for humanization layer responses
}

export class AIGroundedConcierge {
  private static instance: AIGroundedConcierge;

  private constructor() {}

  static getInstance(): AIGroundedConcierge {
    if (!AIGroundedConcierge.instance) {
      AIGroundedConcierge.instance = new AIGroundedConcierge();
    }
    return AIGroundedConcierge.instance;
  }

  // ============================================
  // MAIN CONCIERGE ENTRY POINT
  // ============================================

  async processGroundedQuery(request: GroundedConciergeRequest): Promise<GroundedConciergeResponse> {
    const { query, districtId, userId, context } = request;

    // 🔄 HUMANIZATION LAYER: Check for conversational intent first
    const conversationalResult = classifyConversationalIntent(query);
    if (!conversationalResult.shouldTriggerEntitySearch) {
      // Return conversational response without triggering expensive search
      return {
        answer: conversationalResult.response,
        results: [],
        confidence: conversationalResult.confidence,
        grounding: {
          districtIntelligence: {},
          economicContext: {},
          memoryInsights: []
        },
        recommendations: [],
        followUp: [],
        conversational: true // Flag for UI to handle differently
      };
    }

    // 1. Gather district intelligence (memory, economics, signals)
    const districtIntelligence = await this.gatherDistrictIntelligence(districtId, query);

    // 2. Perform grounded search across all entities
    const searchResults = await this.performGroundedSearch(query, districtId, districtIntelligence);

    // 3. Generate AI response using cognitive routing
    const aiResponse = await this.generateGroundedResponse(query, searchResults, districtIntelligence, context);

    // 4. Build recommendations based on memory patterns
    const recommendations = await this.buildMemoryRecommendations(query, districtId, districtIntelligence);

    // 5. Record interaction in district memory
    await this.recordInteraction(query, districtId, searchResults, userId);

    return {
      answer: aiResponse.answer,
      results: searchResults.entities,
      confidence: aiResponse.confidence,
      grounding: {
        districtIntelligence,
        economicContext: searchResults.economicContext,
        memoryInsights: districtIntelligence.memoryInsights
      },
      recommendations,
      followUp: aiResponse.followUp
    };
  }

  // ============================================
  // DISTRICT INTELLIGENCE GATHERING
  // ============================================

  private async gatherDistrictIntelligence(districtId: number, query: string) {
    // Gather comprehensive district context
    const [
      memoryIntelligence,
      economicClusters,
      activeSignals,
      districtProfile
    ] = await Promise.all([
      districtMemory.getDistrictIntelligence(districtId),
      this.getEconomicClusters(districtId),
      districtMemory.getDistrictSignals(districtId),
      this.getDistrictProfile(districtId)
    ]);

    return {
      memory: memoryIntelligence,
      economics: economicClusters,
      signals: activeSignals,
      profile: districtProfile,
      // Extract query-relevant insights
      relevantInsights: this.extractQueryInsights(query, {
        memory: memoryIntelligence,
        economics: economicClusters,
        signals: activeSignals
      })
    };
  }

  private async getEconomicClusters(districtId: number) {
    // Get economic relationship clusters
    const clusters = await prisma.districtEconomicCluster.findMany({
      where: { districtId },
      include: {
        _count: {
          select: { districtHeatSignals: true }
        }
      }
    });

    return clusters.map(c => ({
      domain: c.domain,
      totalSearches: c.totalSearches,
      totalActions: c.totalActions,
      totalOrders: c.totalOrders,
      growthScore: c.growthScore,
      conversionRate: c.conversionRate,
      heatSignals: c._count.districtHeatSignals
    }));
  }

  private async getDistrictProfile(districtId: number) {
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        name: true,
        slug: true,
        config: true,
        _count: {
          select: {
            vendors: true,
            users: true,
            orders: true
          }
        }
      }
    });

    return district ? {
      name: district.name,
      slug: district.slug,
      totalVendors: district._count.vendors,
      totalUsers: district._count.users,
      totalOrders: district._count.orders,
      config: district.config
    } : null;
  }

  private extractQueryInsights(query: string, intelligence: any) {
    const insights = {
      trendingMatches: [] as any[],
      supplyGapAlerts: [] as any[],
      economicOpportunities: [] as any[],
      riskSignals: [] as any[]
    };

    // Find trending queries that match
    if (intelligence.memory?.trendingQueries) {
      insights.trendingMatches = intelligence.memory.trendingQueries
        .filter((t: any) => query.toLowerCase().includes(t.query.toLowerCase()))
        .slice(0, 3);
    }

    // Find supply gaps that match the query intent
    if (intelligence.memory?.supplyGaps) {
      insights.supplyGapAlerts = intelligence.memory.supplyGaps
        .filter((g: any) => this.queryMatchesGap(query, g))
        .slice(0, 2);
    }

    // Find economic opportunities
    if (intelligence.economics) {
      insights.economicOpportunities = intelligence.economics
        .filter((c: any) => c.growthScore > 0.7)
        .slice(0, 2);
    }

    // Check for risk signals
    if (intelligence.signals) {
      insights.riskSignals = intelligence.signals
        .filter((s: any) => s.intensity > 0.8)
        .slice(0, 2);
    }

    return insights;
  }

  private queryMatchesGap(query: string, gap: any): boolean {
    const queryLower = query.toLowerCase();
    return queryLower.includes(gap.domain.toLowerCase()) ||
           queryLower.includes(gap.entity.toLowerCase()) ||
           gap.domain.toLowerCase().includes(queryLower) ||
           gap.entity.toLowerCase().includes(queryLower);
  }

  // ============================================
  // GROUNDED SEARCH EXECUTION
  // ============================================

  private async performGroundedSearch(query: string, districtId: number, intelligence: any) {
    // Perform comprehensive search across all entity types
    const [
      vendors,
      products,
      services,
      transport
    ] = await Promise.all([
      this.searchVendors(query, districtId, intelligence),
      this.searchProducts(query, districtId, intelligence),
      this.searchServices(query, districtId, intelligence),
      this.searchTransport(query, districtId)
    ]);

    // Apply memory-enhanced ranking
    const rankedEntities = this.rankEntitiesWithMemory([
      ...vendors,
      ...products,
      ...services,
      ...transport
    ], intelligence);

    // Calculate economic context
    const economicContext = this.calculateEconomicContext(rankedEntities, intelligence);

    return {
      entities: rankedEntities,
      economicContext,
      searchMetadata: {
        totalFound: rankedEntities.length,
        byType: {
          vendors: vendors.length,
          products: products.length,
          services: services.length,
          transport: transport.length
        }
      }
    };
  }

  private async searchVendors(query: string, districtId: number, intelligence: any) {
    // First get broader set of vendors
    const allVendors = await prisma.vendor.findMany({
      where: {
        districtId,
        status: 'APPROVED'
      },
      include: {
        vendorMLProfile: true,
        _count: { select: { reviews: true, orders: true } }
      },
      take: 50 // Get more to filter through
    });

    // Extract search terms from query
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    // Filter using unified grounding index
    const relevantVendors = allVendors.filter(vendor => {
      const searchableTerms = getUnifiedGroundingIndex({
        name: vendor.name,
        category: vendor.category,
        businessType: vendor.category,
        description: vendor.description,
        address: vendor.address,
        city: vendor.city
      });
      return searchTerms.some(searchTerm =>
        searchableTerms.some(term => term.includes(searchTerm))
      );
    });

    return relevantVendors.slice(0, 10).map(v => ({
      id: v.id,
      type: 'vendor',
      name: v.name,
      category: v.category,
      trustScore: v.vendorMLProfile?.reliabilityScore || 0,
      rating: v.avgRating,
      reviewCount: v._count.reviews,
      orderCount: v._count.orders,
      isVerified: v.isVerified,
      description: v.description,
      contact: v.phone
    }));
  }

  private async searchProducts(query: string, districtId: number, intelligence: any) {
    // First get broader set of products
    const allProducts = await prisma.product.findMany({
      where: {
        vendor: { districtId },
        approved: true
      },
      include: {
        vendor: { select: { name: true, category: true } },
        _count: { select: { reviews: true } }
      },
      take: 40 // Get more to filter through
    });

    // Extract search terms from query
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    // Filter using unified grounding index
    const relevantProducts = allProducts.filter(product => {
      const searchableTerms = getUnifiedGroundingIndex({
        title: product.title,
        name: product.title,
        category: product.categoryName,
        businessType: product.categoryName,
        description: product.description
      });
      return searchTerms.some(searchTerm =>
        searchableTerms.some(term => term.includes(searchTerm))
      );
    });

    return relevantProducts.slice(0, 8).map(p => ({
      id: p.id,
      type: 'product',
      name: p.title,
      category: p.categoryName,
      price: p.price,
      vendor: p.vendor.name,
      vendorCategory: p.vendor.category,
      rating: p.rating,
      reviewCount: p._count.reviews,
      inStock: p.inStock,
      description: p.description
    }));
  }

  private async searchServices(query: string, districtId: number, intelligence: any) {
    // First get broader set of services
    const allServices = await prisma.serviceWorker.findMany({
      where: {
        districtId,
        isAvailable: true
      },
      take: 30 // Get more to filter through
    });

    // Extract search terms from query
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    // Filter using unified grounding index
    const relevantServices = allServices.filter(service => {
      const searchableTerms = getUnifiedGroundingIndex({
        name: service.name,
        serviceType: service.serviceType,
        category: service.serviceType,
        businessType: service.serviceType,
        description: service.description,
        locality: service.serviceArea
      });
      return searchTerms.some(searchTerm =>
        searchableTerms.some(term => term.includes(searchTerm))
      );
    });

    return relevantServices.slice(0, 6).map(s => ({
      id: s.id,
      type: 'service',
      name: s.name,
      category: s.serviceType,
      rating: s.rating,
      reviewCount: s.reviewCount,
      isVerified: s.isVerified,
      experience: s.experience,
      contact: s.phone,
      serviceArea: s.serviceArea,
      description: s.description
    }));
  }

  private async searchTransport(query: string, districtId: number) {
    // Simple transport search - in production would integrate with transport APIs
    const allBuses = await prisma.busTimetable.findMany({
      where: {
        districtId,
        isActive: true
      },
      take: 20 // Get more to filter through
    });

    // Extract search terms from query
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    // Filter using unified grounding index
    const relevantBuses = allBuses.filter(bus => {
      const searchableTerms = getUnifiedGroundingIndex({
        name: `${bus.fromCity} to ${bus.toCity}`,
        category: 'bus',
        businessType: 'transport',
        entityType: 'bus',
        city: bus.fromCity,
        locality: bus.toCity
      });
      return searchTerms.some(searchTerm =>
        searchableTerms.some(term => term.includes(searchTerm))
      );
    });

    return relevantBuses.slice(0, 4).map(b => ({
      id: b.id,
      type: 'transport',
      name: `${b.fromCity} → ${b.toCity}`,
      category: 'bus',
      price: parseFloat(b.fare),
      schedule: b.firstBusTime,
      operator: b.operatorName,
      busType: b.busType
    }));
  }

  private rankEntitiesWithMemory(entities: any[], intelligence: any) {
    return entities
      .map(entity => {
        let memoryScore = 0;

        // Boost based on trending matches
        const trendingMatches = intelligence.memory?.trendingQueries?.filter((t: any) =>
          entity.name?.toLowerCase().includes(t.query.toLowerCase()) ||
          entity.category?.toLowerCase().includes(t.category?.toLowerCase())
        ).length || 0;
        memoryScore += trendingMatches * 20;

        // Boost for supply gap matches (high demand areas)
        const gapMatches = intelligence.memory?.supplyGaps?.filter((g: any) =>
          entity.category?.toLowerCase().includes(g.domain.toLowerCase())
        ).length || 0;
        memoryScore += gapMatches * 30;

        // Base score calculation
        const baseScore = this.calculateEntityBaseScore(entity);
        const finalScore = baseScore + memoryScore;

        return { ...entity, memoryScore, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10); // Top 10 results
  }

  private calculateEntityBaseScore(entity: any): number {
    let score = 0;

    // Trust and quality factors
    score += (entity.trustScore || 0) * 30;
    score += (entity.rating || 0) * 20;
    score += (entity.reviewCount || 0) * 0.5;
    score += entity.isVerified ? 25 : 0;

    // Type-specific scoring
    switch (entity.type) {
      case 'vendor':
        score += (entity.orderCount || 0) * 0.2;
        break;
      case 'product':
        score += entity.inStock ? 15 : 0;
        break;
      case 'service':
        score += (entity.experience || 0) * 2;
        break;
      case 'transport':
        score += 10; // Base transport score
        break;
    }

    return score;
  }

  private calculateEconomicContext(entities: any[], intelligence: any) {
    const vendorCount = entities.filter(e => e.type === 'vendor').length;
    const productCount = entities.filter(e => e.type === 'product').length;
    const serviceCount = entities.filter(e => e.type === 'service').length;

    return {
      marketDiversity: (vendorCount + productCount + serviceCount) / entities.length,
      economicClusters: intelligence.economics?.length || 0,
      supplyGapImpact: intelligence.memory?.supplyGaps?.length > 0 ? 'high_demand' : 'normal',
      districtHealth: intelligence.memory?.economicHealth || 50
    };
  }

  // ============================================
  // GROUNDED AI RESPONSE GENERATION
  // ============================================

  private async generateGroundedResponse(
    query: string,
    searchResults: any,
    intelligence: any,
    context?: any
  ): Promise<{ answer: string; confidence: number; followUp?: string[] }> {
    // Use cognitive routing to select optimal AI provider
    const response = await aiProviderManager.executeWithRouting('reasoningPlanning', {
      messages: [{
        role: "system",
        content: `You are BharatOS Sovereign AI for district intelligence.
District: ${intelligence.profile?.name || 'Unknown'}
Economic Health: ${intelligence.memory?.economicHealth || 50}/100
Supply Gaps: ${intelligence.memory?.supplyGaps?.length || 0}
Active Signals: ${intelligence.signals?.length || 0}

Rules:
- Ground all responses in actual district data
- Mention supply gaps or economic challenges if relevant
- Suggest alternatives when results are limited
- Be helpful, local, and contextually aware
- Keep responses under 100 words`
      }, {
        role: "user",
        content: `
Query: "${query}"
Found ${searchResults.entities.length} results across ${searchResults.searchMetadata.byType.vendors} vendors, ${searchResults.searchMetadata.byType.products} products, ${searchResults.searchMetadata.byType.services} services.

${searchResults.entities.slice(0, 3).map((e, i) =>
  `${i+1}. ${e.name} (${e.category}) - ${e.type === 'vendor' ? `Trust: ${e.trustScore?.toFixed(1)}` : e.type === 'product' ? `₹${e.price}` : 'Service'}`
).join('\n')}

District Context:
${intelligence.relevantInsights.supplyGapAlerts.length > 0 ?
  `Supply Gaps: ${intelligence.relevantInsights.supplyGapAlerts.map(g => `${g.entity} demand`).join(', ')}` :
  'Normal supply conditions'}

${intelligence.relevantInsights.trendingMatches.length > 0 ?
  `Trending: ${intelligence.relevantInsights.trendingMatches.map(t => `"${t.query}"`).join(', ')}` :
  ''}

Provide a helpful, grounded response in Hinglish.`
      }],
      maxTokens: 150,
      temperature: 0.3
    });

    const answer = response.choices?.[0]?.message?.content || response.text ||
      `Found ${searchResults.entities.length} relevant options in your district.`;

    // Calculate confidence based on results and intelligence
    const confidence = Math.min(1.0,
      (searchResults.entities.length * 0.1) +
      (intelligence.memory?.economicHealth / 100 * 0.3) +
      (intelligence.relevantInsights.supplyGapAlerts.length === 0 ? 0.3 : 0.1) +
      0.3 // Base confidence
    );

    const followUp = confidence < 0.7 ? [
      "Would you like me to search in nearby districts?",
      "I can help you find similar services in the area."
    ] : undefined;

    return { answer, confidence, followUp };
  }

  // ============================================
  // MEMORY-BASED RECOMMENDATIONS
  // ============================================

  private async buildMemoryRecommendations(query: string, districtId: number, intelligence: any) {
    const recommendations = [];

    // Recommend trending alternatives
    if (intelligence.memory?.trendingQueries?.length > 0) {
      const relevantTrends = intelligence.memory.trendingQueries
        .filter((t: any) => t.frequency > 5 && t.trend === 'rising')
        .slice(0, 2);

      if (relevantTrends.length > 0) {
        recommendations.push({
          type: 'trending',
          title: 'Popular in your area',
          items: relevantTrends.map(t => t.query),
          reason: 'These are trending searches in your district'
        });
      }
    }

    // Recommend supply gap opportunities
    if (intelligence.memory?.supplyGaps?.length > 0) {
      const highUrgencyGaps = intelligence.memory.supplyGaps
        .filter((g: any) => g.urgencyScore > 5)
        .slice(0, 2);

      if (highUrgencyGaps.length > 0) {
        recommendations.push({
          type: 'opportunity',
          title: 'High demand services',
          items: highUrgencyGaps.map(g => `${g.domain}: ${g.entity}`),
          reason: 'These services have high demand but limited providers'
        });
      }
    }

    // Economic health recommendations
    if (intelligence.memory?.economicHealth < 70) {
      recommendations.push({
        type: 'economic',
        title: 'District economic insights',
        items: ['Consider verified vendors for better reliability'],
        reason: 'District has some economic challenges - verified partners recommended'
      });
    }

    return recommendations;
  }

  // ============================================
  // INTERACTION RECORDING
  // ============================================

  private async recordInteraction(query: string, districtId: number, searchResults: any, userId?: number) {
    // Record in district memory
    await districtMemory.recordDemand({
      districtId,
      query,
      domain: 'general', // Would be extracted from query analysis
      entity: 'search',
      intent: 'discovery'
    });

    // Record partner interactions
    for (const entity of searchResults.entities.slice(0, 5)) { // Top 5 results
      if (entity.type === 'vendor' && entity.id) {
        await districtMemory.recordPartnerInteraction({
          districtId,
          partnerType: 'vendor',
          partnerId: entity.id,
          interactionType: 'search_result',
          context: { query, position: searchResults.entities.indexOf(entity) + 1 }
        });
      }
    }

    // Record user interaction if user ID provided
    if (userId) {
      await prisma.userEvent.create({
        data: {
          userId,
          districtId,
          action: 'ai_concierge_search',
          meta: {
            query,
            resultsFound: searchResults.entities.length,
            confidence: 0.8 // Would be calculated
          },
          queryText: query,
          parsedIntent: 'discovery',
          matchedVendorIds: searchResults.entities
            .filter(e => e.type === 'vendor')
            .map(e => e.id)
            .slice(0, 5),
          converted: false
        }
      });
    }
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const aiGroundedConcierge = AIGroundedConcierge.getInstance();