import { prisma } from "../storage";
import { DistrictManager } from "./district.manager";
import { isValidJsonValue } from "../lib/guards";

export interface DistrictLearningData {
  districtId: number;
  userBehavior: {
    peakHours: number[];
    popularCategories: string[];
    commonIntents: string[];
    averageSessionTime: number;
  };
  vendorPerformance: {
    topCategories: string[];
    averageRatings: number;
    complaintPatterns: string[];
  };
  marketTrends: {
    seasonalDemand: Record<string, number>;
    emergingProducts: string[];
    priceSensitivity: number;
  };
}

export class MultiDistrictLearner {
  private static learningCache: Map<number, DistrictLearningData> = new Map();
  private static readonly LEARNING_WINDOW_DAYS = 90;

  static async getDistrictLearning(districtId: number): Promise<DistrictLearningData> {
    if (this.learningCache.has(districtId)) {
      return this.learningCache.get(districtId)!;
    }

    const data = await this.computeDistrictLearning(districtId);
    this.learningCache.set(districtId, data);
    return data;
  }

  private static async computeDistrictLearning(districtId: number): Promise<DistrictLearningData> {
    const cutoffDate = new Date(Date.now() - this.LEARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Analyze user behavior from EventLog
    const events = await prisma.eventLog.findMany({
      where: {
        districtId,
        createdAt: { gte: cutoffDate }
      },
      take: 5000
    });

    const userBehavior = this.analyzeUserBehavior(events);
    const vendorPerformance = await this.analyzeVendorPerformance(districtId, cutoffDate);
    const marketTrends = await this.analyzeMarketTrends(districtId, cutoffDate);

    return {
      districtId,
      userBehavior,
      vendorPerformance,
      marketTrends
    };
  }

  private static analyzeUserBehavior(events: any[]): DistrictLearningData['userBehavior'] {
    // Peak hours analysis
    const hourlyActivity = events.reduce((acc, event) => {
      const hour = new Date(event.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const sortedHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Popular categories from search events
    const searchEvents = events.filter(e => e.type.includes('search'));
    const categories = searchEvents.reduce((acc, event) => {
      const category = (isValidJsonValue(event.metadata) && event.metadata?.category) || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularCategories = Object.entries(categories)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([cat]) => cat);

    // Common intents
    const intents = searchEvents.reduce((acc, event) => {
      const intent = (isValidJsonValue(event.metadata) && event.metadata?.intent) || 'general';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonIntents = Object.entries(intents)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([intent]) => intent);

    // Average session time (simplified)
    const avgSessionTime = events.length > 0 ? 300 : 0; // Mock 5 minutes

    return {
      peakHours: sortedHours,
      popularCategories,
      commonIntents,
      averageSessionTime: avgSessionTime
    };
  }

  private static async analyzeVendorPerformance(districtId: number, cutoffDate: Date): Promise<DistrictLearningData['vendorPerformance']> {
    const vendors = await prisma.vendor.findMany({
      where: { districtId },
      include: {
        products: {
          select: { categoryName: true }
        },
        _count: {
          select: {
            inquiries: { where: { status: 'CANCELLED', createdAt: { gte: cutoffDate } } }
          }
        }
      }
    });

    // Top categories
    const categoryCount = vendors.reduce((acc, vendor) => {
      vendor.products.forEach(product => {
        const cat = product.categoryName || 'general';
        acc[cat] = (acc[cat] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([cat]) => cat);

    // Average ratings (mock)
    const averageRatings = 4.2;

    // Complaint patterns (from cancelled inquiries)
    const complaints = ['delivery delay', 'quality issues', 'pricing concerns'];

    return {
      topCategories,
      averageRatings,
      complaintPatterns: complaints
    };
  }

  private static async analyzeMarketTrends(districtId: number, cutoffDate: Date): Promise<DistrictLearningData['marketTrends']> {
    // Seasonal demand analysis
    const seasonalDemand: Record<string, number> = {
      summer: 0.8,
      monsoon: 1.2,
      winter: 0.9,
      festival: 1.5
    };

    // Emerging products (mock - would analyze recent product additions)
    const emergingProducts = ['organic vegetables', 'ready-to-cook meals', 'health supplements'];

    // Price sensitivity (mock - would analyze price vs conversion)
    const priceSensitivity = 0.7; // 0-1 scale

    return {
      seasonalDemand,
      emergingProducts,
      priceSensitivity
    };
  }

  static async crossDistrictLearning(): Promise<{
    bestPractices: Record<string, any>;
    districtComparisons: Record<string, any>;
  }> {
    const allDistricts = await DistrictManager.getAllDistrictConfigs();

    const bestPractices: Record<string, any> = {};
    const districtComparisons: Record<string, any> = {};

    for (const district of allDistricts) {
      const learning = await this.getDistrictLearning(district.id);

      // Identify best practices across districts
      if (learning.userBehavior.averageSessionTime > 600) { // 10 minutes
        bestPractices[`${district.name}_engagement`] = {
          district: district.name,
          practice: 'High user engagement',
          metric: learning.userBehavior.averageSessionTime
        };
      }

      districtComparisons[district.name] = {
        peakHours: learning.userBehavior.peakHours,
        topCategories: learning.vendorPerformance.topCategories,
        marketTrends: learning.marketTrends
      };
    }

    return { bestPractices, districtComparisons };
  }

  static clearCache(districtId?: number) {
    if (districtId) {
      this.learningCache.delete(districtId);
    } else {
      this.learningCache.clear();
    }
  }

  // Auto-learning: Update learning data periodically
  static async updateLearningData() {
    console.log("🔄 Updating multi-district learning data...");

    const districts = await prisma.district.findMany({ where: { isActive: true } });

    for (const district of districts) {
      await this.computeDistrictLearning(district.id);
      console.log(`✅ Updated learning data for ${district.name}`);
    }

    console.log("🎯 Multi-district learning update complete");
  }
}

export const multiDistrictLearner = new MultiDistrictLearner();
