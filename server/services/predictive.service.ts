// @ts-nocheck
import { prisma } from "../storage";
import { analyzeEventPatterns } from "./prediction.engine";
import { DistrictManager } from "./district.manager";

export interface PersonalizedRecommendation {
  type: 'product' | 'vendor' | 'category';
  id: number;
  name: string;
  reason: string;
  confidence: number;
  imageUrl?: string;
}

export const getPredictiveHomepage = async (userId?: number, districtId?: number): Promise<PersonalizedRecommendation[]> => {
  if (!districtId) {
    throw new Error('District ID required for predictive recommendations');
  }
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  // Analyze user's past behavior
  const userEvents = userId ? await prisma.eventLog.findMany({
    where: {
      userId,
      districtId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    take: 500
  }) : [];

  const recommendations: PersonalizedRecommendation[] = [];

  // Time-based suggestions
  if (hour >= 6 && hour < 12) {
    // Morning: Breakfast items
    recommendations.push({
      type: 'category',
      id: 1,
      name: 'Breakfast Essentials',
      reason: 'Perfect time for morning meals and fresh items',
      confidence: 0.8
    });
  } else if (hour >= 17 && hour < 21) {
    // Evening: Snacks and dinner
    recommendations.push({
      type: 'category',
      id: 2,
      name: 'Evening Snacks',
      reason: 'Time for evening refreshments and family snacks',
      confidence: 0.8
    });
  }

  // Behavior-based suggestions from EventLog
  if (userEvents.length > 0) {
    const searchPatterns = userEvents.filter(e => e.type.includes('search'));
    const viewedCategories = searchPatterns.map(e => (e.metadata as any)?.category).filter(Boolean);

    if (viewedCategories.includes('food')) {
      // User frequently searches food
      const popularFoodVendors = await prisma.vendor.findMany({
        where: {
          districtId,
          businessType: 'PRODUCT',
          specialties: { hasSome: ['food', 'snacks'] }
        },
        take: 3
      });

      popularFoodVendors.forEach(vendor => {
        recommendations.push({
          type: 'vendor',
          id: vendor.id,
          name: vendor.name,
          reason: 'Based on your food search history',
          confidence: 0.7,
          imageUrl: vendor.logo || undefined
        });
      });
    }
  }

  // Festival/local event awareness
  const localPulse = await getLocalPulse(districtId);
  if (localPulse.isFestival) {
    recommendations.push({
      type: 'category',
      id: 3,
      name: localPulse.eventName || 'Festival Specials',
      reason: `${localPulse.eventName} celebration - special offers available`,
      confidence: 0.9
    });
  }

  // Weather-based suggestions
  if (localPulse.weather === 'hot') {
    recommendations.push({
      type: 'category',
      id: 4,
      name: 'Cool Drinks & Ice Cream',
      reason: 'Beat the heat with refreshing options',
      confidence: 0.8
    });
  }

  // Trending products based on recent activity
  const trendingProducts = await prisma.product.findMany({
    where: {
      districtId,
      isTrending: true
    },
    take: 5,
    include: { vendor: true }
  });

  trendingProducts.forEach(product => {
    recommendations.push({
      type: 'product',
      id: product.id,
      name: product.title,
      reason: 'Currently trending in your area',
      confidence: 0.6,
      imageUrl: product.imageUrl || undefined
    });
  });

  // Remove duplicates and sort by confidence
  const uniqueRecommendations = recommendations.filter((rec, index, self) =>
    index === self.findIndex(r => r.id === rec.id && r.type === rec.type)
  );

  return uniqueRecommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12); // Top 12 recommendations
};

// Local Pulse API implementation
export interface LocalPulseData {
  weather: string;
  temperature: number;
  isFestival: boolean;
  eventName?: string;
  localNews?: string[];
  trafficCondition: 'normal' | 'heavy' | 'light';
}

export const getLocalPulse = async (districtId: number): Promise<LocalPulseData> => {
  const districtConfig = await DistrictManager.getDistrictConfig(districtId);

  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();

  // Check for current festival
  const currentFestival = districtConfig.festivals.find(f => f.month === month && f.date === date);

  // Determine weather based on district patterns
  const weatherPattern = Object.entries(districtConfig.weatherPatterns)
    .find(([, pattern]) => pattern.months.includes(month));

  const weather = weatherPattern ? weatherPattern[0] as 'hot' | 'rainy' | 'winter' : 'mild';
  const temperature = weatherPattern ? weatherPattern[1].avgTemp : 25;

  // Generate local news based on festivals and events
  const localNews: string[] = [];
  if (currentFestival) {
    localNews.push(`${currentFestival.name} - ${currentFestival.significance}`);
  }

  // Add weather alerts
  if (weather === 'hot' && temperature > 40) {
    localNews.push('Heat wave alert - Stay hydrated and avoid outdoor activities during peak hours');
  } else if (weather === 'rainy') {
    localNews.push('Monsoon season - Check local weather for updates');
  }

  return {
    weather,
    temperature,
    isFestival: !!currentFestival,
    eventName: currentFestival?.name,
    localNews,
    trafficCondition: currentFestival ? 'heavy' : 'normal'
  };
};
