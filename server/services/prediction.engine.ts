// @ts-nocheck
import { prisma } from "../storage";
import { getTrustScore } from "./dssl.service";

export const analyzeEventPatterns = async (districtId: number) => {
  // Analyze event logs for patterns
  const events = await prisma.eventLog.findMany({
    where: { districtId },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });

  const patterns = {
    searchTrends: events.filter(e => (e.type || '').includes('search') || e.eventType.includes('search')).length,
    clickTrends: events.filter(e => (e.type || '').includes('click') || e.eventType.includes('click')).length,
    orderTrends: events.filter(e => (e.type || '').includes('order') || e.eventType.includes('order')).length,
    userActivity: events.reduce((acc, e) => {
      const uId = String((e.metadata as any)?.userId || (e.eventData as any)?.userId || 'anonymous');
      acc[uId] = (acc[uId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    timePatterns: events.reduce((acc, e) => {
      const hour = new Date(e.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  };

  return patterns;
};

export const predictVendorPerformance = async (vendorId: number, districtId: number) => {
  const insights = await prisma.aIInsight.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Check if we have sufficient historical data
  if (insights.length < 10) {
    return {
      status: "insufficient_data",
      message: "Collecting real district data..."
    };
  }

  const currentScoreResult = await getTrustScore(vendorId, districtId);
  const currentScore = { total: currentScoreResult.score };

  // Simple prediction based on trend
  const avgError = insights.reduce((sum, i) => sum + (i.error || 0), 0) / insights.length;
  const trend = insights.length > 1 ? insights[0].predictedScore - insights[1].predictedScore : 0;

  const prediction = {
    nextMonthScore: Math.max(0, Math.min(1, currentScore.total + trend - avgError * 0.1)),
    confidence: 1 - avgError,
    factors: {
      historicalAccuracy: 1 - avgError,
      trendDirection: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'
    }
  };

  return prediction;
};

export const predictMarketTrends = async (districtId: number) => {
  const events = await prisma.eventLog.findMany({
    where: { districtId },
    take: 1000
  });

  // Check if we have sufficient historical data
  if (events.length < 100) {
    return {
      status: "insufficient_data",
      message: "Collecting real district data..."
    };
  }

  // Predict popular categories based on searches
  const categorySearches = events
    .filter(e => ((e.type || '').includes('search') || e.eventType.includes('search')) && e.metadata && typeof e.metadata === 'object' && 'intent' in (e.metadata as any) && (e.metadata as any).intent === 'category')
    .reduce((acc, e) => {
      const category = (e.metadata && typeof e.metadata === 'object' && 'category' in (e.metadata as any) && typeof (e.metadata as any).category === 'string') ? (e.metadata as any).category : 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(categorySearches)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return {
    topCategories,
    predictedGrowth: Math.random() * 0.2 + 0.8, // Mock growth factor
    seasonalTrends: ['winter', 'summer'][Math.floor(Math.random() * 2)]
  };
};
