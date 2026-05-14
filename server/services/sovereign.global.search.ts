import { prisma } from "../storage";
import { parseNaturalLanguage, IntentMatch } from "./intent.service";
import { LocalIntelligenceManager } from "./local.intelligence.profile";
import { DistrictManager } from "./district.manager";
import { calculateSovereignScore } from "./brain.service";

export interface GlobalSearchResult {
  localResults: IntentMatch[];
  crossDistrictSuggestions: Array<{
    districtId: number;
    districtName: string;
    results: IntentMatch[];
    distance: number; // km
    transportCost: number;
    deliveryTime: string;
  }>;
  recommendations: {
    alternativeItems: string[];
    nearbyDistricts: Array<{
      id: number;
      name: string;
      similarity: number;
      topCategories: string[];
    }>;
  };
}

export class SovereignGlobalSearch {
  static async globalIntentSearch(
    query: string,
    userDistrictId: number,
    voiceTranscript?: string,
    maxDistance: number = 100
  ): Promise<GlobalSearchResult> {
    // Parse the intent from natural language
    const intentQuery = await parseNaturalLanguage(query, voiceTranscript, userDistrictId);

    // Search locally first
    const localResults = await this.searchInDistrict(intentQuery, userDistrictId);

    // Find nearby districts for cross-district search
    const nearbyDistricts = await this.findNearbyDistricts(userDistrictId, maxDistance);

    // Search in nearby districts
    const crossDistrictResults = await Promise.all(
      nearbyDistricts.map(async (district) => {
        const results = await this.searchInDistrict(intentQuery, district.id);
        return {
          districtId: district.id,
          districtName: district.name,
          results,
          distance: district.distance,
          transportCost: this.calculateTransportCost(district.distance, intentQuery.urgency),
          deliveryTime: this.calculateDeliveryTime(district.distance, intentQuery.urgency)
        };
      })
    );

    // Filter out districts with no results and sort by relevance
    const validCrossDistrict = crossDistrictResults
      .filter(r => r.results.length > 0)
      .sort((a, b) => {
        // Prioritize closer districts and higher match counts
        const distanceScore = (maxDistance - a.distance) / maxDistance;
        const matchScore = Math.min(a.results.length / 5, 1); // Cap at 5 matches
        return (b.distanceScore + b.matchScore) - (a.distanceScore + a.matchScore);
      });

    // Generate recommendations
    const recommendations = await this.generateRecommendations(intentQuery, userDistrictId, nearbyDistricts);

    return {
      localResults,
      crossDistrictSuggestions: validCrossDistrict,
      recommendations
    };
  }

  private static async searchInDistrict(intentQuery: any, districtId: number): Promise<IntentMatch[]> {
    // Get vendors in the district
    const vendors = await prisma.vendor.findMany({
      where: {
        districtId,
        status: 'APPROVED'
      },
      include: {
        vendorMLProfile: true,
        products: {
          take: 10,
          include: {
            category: true
          }
        }
      }
    });

    const matches: IntentMatch[] = [];

    for (const vendor of vendors) {
      // Calculate sovereign score for vendor
      const sovereignScore = await calculateSovereignScore(vendor.id, districtId);

      // Check if vendor matches intent
      const relevanceScore = await this.calculateVendorRelevance(vendor, intentQuery, districtId);

      if (relevanceScore > 0.3) { // Minimum relevance threshold
        matches.push({
          vendorId: vendor.id,
          relevanceScore,
          matchReasons: this.generateMatchReasons(vendor, intentQuery, relevanceScore),
          distance: 0, // Local search
          estimatedTime: intentQuery.urgency === 'high' ? '30 mins' : '1 hour'
        });
      }
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
  }

  private static async calculateVendorRelevance(vendor: any, intentQuery: any, districtId: number): Promise<number> {
    let score = 0;

    // Intent type matching
    if (intentQuery.intent === 'food' && vendor.businessType === 'PRODUCT') {
      score += 0.3;
    }
    if (intentQuery.intent === 'service' && vendor.businessType === 'SERVICE') {
      score += 0.3;
    }

    // Keyword matching in vendor data
    const vendorText = `${vendor.name} ${vendor.description} ${vendor.products.map((p: any) => p.title).join(' ')}`.toLowerCase();
    const keywordMatches = intentQuery.keywords.filter((k: string) =>
      vendorText.includes(k.toLowerCase())
    ).length;
    score += Math.min(keywordMatches * 0.1, 0.3);

    // Category matching
    const vendorCategories = vendor.products.map((p: any) => p.categoryName).filter(Boolean);
    const categoryMatches = intentQuery.keywords.filter((k: string) =>
      vendorCategories.some((cat: string) => cat.toLowerCase().includes(k.toLowerCase()))
    ).length;
    score += Math.min(categoryMatches * 0.15, 0.2);

    // Preference matching using LIP
    const lip = await LocalIntelligenceManager.getLIP(districtId);
    const preferenceMatches = intentQuery.preferences.filter((p: string) =>
      vendorText.includes(p.toLowerCase()) ||
      lip.preferenceProfile.cuisinePreferences.regionalSpecialties.some((s: string) =>
        vendorText.includes(s.toLowerCase())
      )
    ).length;
    score += Math.min(preferenceMatches * 0.1, 0.2);

    return Math.min(score, 1);
  }

  private static generateMatchReasons(vendor: any, intentQuery: any, score: number): string[] {
    const reasons: string[] = [];

    if (score > 0.8) reasons.push("Perfect match for your requirements");
    else if (score > 0.6) reasons.push("Great match with high relevance");
    else if (score > 0.4) reasons.push("Good match for your needs");

    if (intentQuery.urgency === 'high') {
      reasons.push("Prioritized for urgent delivery");
    }

    if (vendor.vendorMLProfile?.reliabilityScore > 0.8) {
      reasons.push("Highly reliable vendor");
    }

    return reasons;
  }

  private static async findNearbyDistricts(userDistrictId: number, maxDistance: number) {
    // In a real implementation, this would use geographical distance
    // For now, we'll use a simplified approach based on district relationships

    const allDistricts = await DistrictManager.getAllDistrictConfigs();
    const userDistrict = allDistricts.find(d => d.id === userDistrictId);

    if (!userDistrict) return [];

    // Mock distances (in km) - in reality, use lat/lng coordinates
    const districtDistances: Record<string, Record<string, number>> = {
      'Shahdol': { 'Anuppur': 80, 'Umaria': 120 },
      'Anuppur': { 'Shahdol': 80, 'Umaria': 60 },
      'Umaria': { 'Shahdol': 120, 'Anuppur': 60 }
    };

    const distances = districtDistances[userDistrict.name] || {};

    return Object.entries(distances)
      .filter(([, distance]) => distance <= maxDistance)
      .map(([name, distance]) => {
        const district = allDistricts.find(d => d.name === name);
        return district ? { ...district, distance } : null;
      })
      .filter(Boolean);
  }

  private static calculateTransportCost(distance: number, urgency: string): number {
    const baseCost = distance * 2; // ₹2 per km
    const urgencyMultiplier = urgency === 'high' ? 1.5 : urgency === 'medium' ? 1.2 : 1.0;
    return Math.round(baseCost * urgencyMultiplier);
  }

  private static calculateDeliveryTime(distance: number, urgency: string): string {
    const baseHours = distance / 40; // Assuming 40 km/h average speed
    const urgencyReduction = urgency === 'high' ? 0.5 : urgency === 'medium' ? 0.8 : 1.0;
    const totalHours = baseHours * urgencyReduction;

    if (totalHours < 1) {
      return `${Math.round(totalHours * 60)} mins`;
    } else {
      return `${Math.round(totalHours * 10) / 10} hours`;
    }
  }

  private static async generateRecommendations(intentQuery: any, userDistrictId: number, nearbyDistricts: any[]) {
    const lip = await LocalIntelligenceManager.getLIP(userDistrictId);

    // Alternative items based on preferences
    const alternativeItems = intentQuery.keywords.flatMap(keyword => {
      // Simple keyword expansion - in reality, use ML/NLP
      const alternatives: Record<string, string[]> = {
        'पनीर': ['टोफू', 'छाछ', 'दही'],
        'दूध': ['दही', 'छाछ', 'बटर'],
        'रोटी': ['पराठा', 'नान', 'पूरी']
      };
      return alternatives[keyword] || [];
    }).slice(0, 3);

    // Nearby districts with similarity scores
    const districtSimilarities = await Promise.all(
      nearbyDistricts.map(async (district) => {
        const similarity = await LocalIntelligenceManager.getDialectSimilarity(userDistrictId, district.id);
        const districtLIP = await LocalIntelligenceManager.getLIP(district.id);

        return {
          id: district.id,
          name: district.name,
          similarity,
          topCategories: Object.entries(districtLIP.preferenceProfile.shoppingPatterns.categoryPreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([cat]) => cat)
        };
      })
    );

    return {
      alternativeItems,
      nearbyDistricts: districtSimilarities.sort((a, b) => b.similarity - a.similarity)
    };
  }
}
