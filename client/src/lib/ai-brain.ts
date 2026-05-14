// AI District Brain Client
// Handles all AI-powered features for district-specific commerce

import { apiRequest } from "./api-client";

export interface AISearchResult {
  id: number;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  vendor: {
    id: number;
    name: string;
    rating?: number;
    totalReviews?: number;
  };
  dsslScore: number;
  relevanceScore?: number;
  similarity?: number;
}

export interface DSSLScore {
  vendorId: number;
  vendorName: string;
  dsslScore: number;
  components: {
    rating: number;
    reviews: number;
    productCount: number;
    orderCount: number;
    accountAge: number;
  };
}

export interface AIRecommendation {
  id: number;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  vendor: {
    id: number;
    name: string;
    rating?: number;
  };
  dsslScore: number;
}

export interface TrendingItem {
  id: number;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  vendor: {
    id: number;
    name: string;
    rating?: number;
  };
  orderCount: number;
  dsslScore: number;
}

export interface DSSLBadge {
  vendorId: number;
  vendorName: string;
  dsslScore: number;
  badge: {
    level: string;
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: string;
    description: string;
  };
  components: {
    rating: number;
    reviews: number;
    productCount: number;
    orderCount: number;
    accountAge: number;
  };
}

// 🔍 AI Search Engine
export async function aiSearch(query: string, limit: number = 20): Promise<{
  success: boolean;
  query: string;
  results: AISearchResult[];
  total: number;
  districtId: number;
}> {
  return apiRequest('POST', 'ai/search', { query, limit });
}

// 🧠 DSSL Ranking Engine
export async function getDSSLScore(vendorIds: number[]): Promise<{
  success: boolean;
  scores: DSSLScore[];
  districtId: number;
}> {
  return apiRequest('POST', 'ai/dssl-score', { vendorIds });
}

// 🎯 AI Recommendations
export async function getAIRecommendations(limit: number = 10): Promise<{
  success: boolean;
  recommendations: AIRecommendation[];
  basedOn: {
    categories: string[];
    vendors: number[];
    orderCount: number;
  };
  districtId: number;
}> {
  return apiRequest('GET', `ai/recommendations?limit=${limit}`);
}

// 📈 AI Trending
export async function getAITrending(timeframe: '1d' | '7d' | '30d' = '7d', limit: number = 10): Promise<{
  success: boolean;
  trending: TrendingItem[];
  timeframe: string;
  districtId: number;
  totalAnalyzed: number;
}> {
  return apiRequest('GET', `ai/trending?timeframe=${timeframe}&limit=${limit}`);
}

// 📊 User Signal Tracking
export async function trackAISignal(
  type: 'view' | 'click' | 'search' | 'order' | 'add_to_cart' | 'wishlist',
  productId?: number,
  searchQuery?: string,
  category?: string,
  metadata?: Record<string, any>
): Promise<{
  success: boolean;
  eventId: number;
  tracked: boolean;
  districtId: number;
}> {
  return apiRequest('POST', 'ai/track', {
      type,
      productId,
      searchQuery,
      category,
      metadata
    });
}

// 🧠 Smart Search with AI Enhancement
export async function smartSearch(query: string): Promise<AISearchResult[]> {
  try {
    // Try vector search first (10x more accurate)
    try {
      const vectorResponse = await vectorSearch(query);
      if (vectorResponse && vectorResponse.results.length > 0) {
        // Track vector search signal
        await trackAISignal('search', undefined, query, 'vector_search');

        return vectorResponse.results.map(result => ({
          ...result,
          // Transform vector search results to match AI search format
          relevanceScore: (result.similarity || 0) * 100 // Convert similarity to relevance score
        }));
      }
    } catch (vectorError) {
      console.warn('Vector search failed, falling back to regular AI search:', vectorError);
    }

    // Fallback to regular AI search
    const response = await aiSearch(query);

    if (response && response.results.length > 0) {
      // Track search signal
      await trackAISignal('search', undefined, query);

      return response.results;
    }

    return [];
  } catch (error) {
    console.error('AI Search failed:', error);
    return [];
  }
}

// 🧠 Vector Search (10x More Accurate)
export async function vectorSearch(query: string, limit: number = 20): Promise<{
  success: boolean;
  query: string;
  results: AISearchResult[];
  total: number;
  searchType: string;
  districtId: number;
}> {
  return apiRequest('POST', 'ai/vector-search', { query, limit });
}

// 🎯 Personalized Recommendations
export async function getPersonalizedRecommendations(): Promise<AIRecommendation[]> {
  try {
    const response = await getAIRecommendations(12);

    if (response && response.recommendations.length > 0) {
      return response.recommendations;
    }

    return [];
  } catch (error) {
    console.error('AI Recommendations failed:', error);
    return [];
  }
}

// 📈 Trending Products
export async function getTrendingProducts(): Promise<TrendingItem[]> {
  try {
    const response = await getAITrending('7d', 15);

    if (response && response.trending.length > 0) {
      return response.trending;
    }

    return [];
  } catch (error) {
    console.error('AI Trending failed:', error);
    return [];
  }
}

// 🏆 DSSL Badge System - Sovereign Trust Competition
export async function getDSSLBadge(vendorId: number): Promise<DSSLBadge | null> {
  try {
    const response = await apiRequest('GET', `ai/dssl-badge/${vendorId}`);

    if (response) {
      return response;
    }

    return null;
  } catch (error) {
    console.error('DSSL Badge fetch failed:', error);
    return null;
  }
}