/**
 * ============================================
 * AI EXPLAINABILITY LAYER - BharatOS
 * ============================================
 * Making AI decisions transparent and explainable
 *
 * Provides detailed reasoning for AI-driven decisions
 * Enables trust, debugging, and continuous improvement
 */

import { isValidJsonValue } from "./guards";

export interface Explanation {
  reason: string;
  confidence: number; // 0-1 scale
  factors: Array<{
    name: string;
    value: any;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  alternatives?: Array<{
    option: string;
    confidence: number;
    reasoning: string;
  }>;
  metadata?: Record<string, any>;
}

export interface FraudExplanation extends Explanation {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: {
    anomalyScore: number;
    patternMatches: string[];
    behaviorFlags: string[];
    historicalTrends: string[];
  };
  recommendations: string[];
}

export interface RecommendationExplanation extends Explanation {
  type: 'vendor' | 'product' | 'category';
  ranking: {
    position: number;
    total: number;
    percentile: number;
  };
  personalization: {
    userProfile: string[];
    contextFactors: string[];
    seasonalTrends: string[];
  };
}

/**
 * Generate fraud analysis explanation
 */
export const explainFraudDecision = (
  fraudScore: number,
  anomalyScore: number,
  patternMatches: any[],
  behaviorFlags: string[],
  historicalData: any
): FraudExplanation => {
  const factors = [];

  // Anomaly score factor
  factors.push({
    name: 'Anomaly Detection',
    value: anomalyScore,
    weight: 0.6,
    impact: anomalyScore > 70 ? 'negative' as const : anomalyScore > 40 ? 'neutral' as const : 'positive' as const,
  });

  // Pattern matching factor
  const patternScore = patternMatches.reduce((sum, p) => sum + (p.scoreBoost || 0), 0);
  factors.push({
    name: 'Pattern Recognition',
    value: patternScore,
    weight: 0.3,
    impact: patternScore > 5 ? 'negative' as const : 'neutral' as const,
  });

  // Historical trend factor
  const historicalAvg = historicalData?.length > 0
    ? historicalData.reduce((sum: number, h: { score: number }) => sum + h.score, 0) / historicalData.length
    : fraudScore;

  factors.push({
    name: 'Historical Trend',
    value: historicalAvg,
    weight: 0.1,
    impact: fraudScore > historicalAvg * 1.2 ? 'negative' as const : 'neutral' as const,
  });

  // Determine risk level
  let riskLevel: FraudExplanation['riskLevel'];
  let confidence: number;
  let reason: string;

  if (fraudScore >= 80) {
    riskLevel = 'CRITICAL';
    confidence = 0.95;
    reason = 'Critical fraud indicators detected - immediate action required';
  } else if (fraudScore >= 60) {
    riskLevel = 'HIGH';
    confidence = 0.85;
    reason = 'High fraud risk - monitoring recommended';
  } else if (fraudScore >= 40) {
    riskLevel = 'MEDIUM';
    confidence = 0.70;
    reason = 'Moderate fraud indicators - review suggested';
  } else {
    riskLevel = 'LOW';
    confidence = 0.90;
    reason = 'Low fraud risk - normal operation';
  }

  // Generate recommendations
  const recommendations = [];
  if (riskLevel === 'CRITICAL') {
    recommendations.push('Immediate suspension recommended');
    recommendations.push('Manual review by admin required');
    recommendations.push('User notification pending');
  } else if (riskLevel === 'HIGH') {
    recommendations.push('Enhanced monitoring activated');
    recommendations.push('Transaction limits applied');
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('Regular monitoring scheduled');
    recommendations.push('Additional verification requested');
  }

  return {
    reason,
    confidence,
    riskLevel,
    factors,
    signals: {
      anomalyScore,
      patternMatches: patternMatches.map(p => p.pattern || 'Unknown pattern'),
      behaviorFlags,
      historicalTrends: historicalData?.length > 0
        ? [`Average score: ${historicalAvg.toFixed(1)}`, `Trend: ${fraudScore > historicalAvg ? 'Increasing' : 'Stable'}`]
        : ['No historical data'],
    },
    recommendations,
  };
};

/**
 * Generate vendor recommendation explanation
 */
export const explainVendorRecommendation = (
  vendor: any,
  position: number,
  total: number,
  userContext: any
): RecommendationExplanation => {
  const factors = [];

  // DSSL Score factor
  factors.push({
    name: 'DSSL Trust Score',
    value: vendor.dsslScore,
    weight: 0.4,
    impact: vendor.dsslScore >= 80 ? 'positive' as const : vendor.dsslScore >= 60 ? 'neutral' as const : 'negative' as const,
  });

   // Rating factor
   factors.push({
     name: 'Customer Rating',
     value: vendor.avgRating,
     weight: 0.3,
     impact: (vendor.avgRating || 0) >= 4.0 ? 'positive' as const : (vendor.avgRating || 0) >= 3.0 ? 'neutral' as const : 'negative' as const,
   });

   // Conversion rate factor
   const safeConversionRate = isValidJsonValue(vendor.conversionRate) && typeof vendor.conversionRate === 'number' ? vendor.conversionRate : 0;
   factors.push({
     name: 'Conversion Rate',
     value: safeConversionRate,
     weight: 0.2,
     impact: safeConversionRate >= 0.3 ? 'positive' as const : safeConversionRate >= 0.1 ? 'neutral' as const : 'negative' as const,
   });

   // Repeat customer factor
   const safeRepeatRate = isValidJsonValue(vendor.repeatRate) && typeof vendor.repeatRate === 'number' ? vendor.repeatRate : 0;
   factors.push({
     name: 'Repeat Customers',
     value: safeRepeatRate,
     weight: 0.1,
     impact: safeRepeatRate >= 0.4 ? 'positive' as const : safeRepeatRate >= 0.2 ? 'neutral' as const : 'negative' as const,
   });

   // Calculate confidence based on data quality
   const dataPoints = [vendor.dsslScore, vendor.avgRating, safeConversionRate, safeRepeatRate]
     .filter(val => val != null).length;
  const confidence = Math.min(0.95, 0.6 + (dataPoints * 0.1));

  // Personalization factors
  const personalization = {
    userProfile: [] as string[],
    contextFactors: [] as string[],
    seasonalTrends: [] as string[],
  };

  if (userContext?.preferredCategories?.includes(vendor.category)) {
    personalization.userProfile.push('Category preference match');
  }

  if (userContext?.location === vendor.districtId) {
    personalization.contextFactors.push('Local vendor');
  }

  // Alternatives (show next 2 options)
  const alternatives = position < total - 1 ? [
    {
      option: `Position ${position + 2}`,
      confidence: confidence * 0.8,
      reasoning: 'Similar profile with slightly lower scores',
    },
  ] : undefined;

  return {
    type: 'vendor',
    reason: `Recommended based on ${factors.filter(f => f.impact === 'positive').length} positive factors`,
    confidence,
    factors,
    ranking: {
      position,
      total,
      percentile: ((total - position) / total) * 100,
    },
    personalization,
    alternatives,
  };
};

/**
 * Generate product recommendation explanation
 */
export const explainProductRecommendation = (
  product: any,
  position: number,
  total: number,
  userPreferences: any
): RecommendationExplanation => {
  const factors = [];

  // Price competitiveness
  factors.push({
    name: 'Price Competitiveness',
    value: product.price,
    weight: 0.3,
    impact: product.price <= (userPreferences?.budgetRange?.max || Infinity) ? 'positive' as const : 'negative' as const,
  });

  // Rating factor
  factors.push({
    name: 'Product Rating',
    value: product.rating,
    weight: 0.25,
    impact: (product.rating || 0) >= 4.0 ? 'positive' as const : 'neutral' as const,
  });

  // Popularity factor
  factors.push({
    name: 'Popularity',
    value: product.orderCount || 0,
    weight: 0.2,
    impact: (product.orderCount || 0) > 10 ? 'positive' as const : 'neutral' as const,
  });

  // Vendor trust factor
  factors.push({
    name: 'Vendor Trust',
    value: product.vendor?.dsslScore,
    weight: 0.25,
    impact: (product.vendor?.dsslScore || 0) >= 70 ? 'positive' as const : 'neutral' as const,
  });

  const confidence = 0.85; // Product recommendations are generally reliable

  return {
    type: 'product',
    reason: 'Recommended based on user preferences and product quality metrics',
    confidence,
    factors,
    ranking: {
      position,
      total,
      percentile: ((total - position) / total) * 100,
    },
    personalization: {
      userProfile: userPreferences?.categories || [],
      contextFactors: ['Price range', 'Quality preference'],
      seasonalTrends: [], // Could be populated based on season
    },
  };
};

/**
 * Add explanation to API response
 */
export const withExplanation = <T>(
  data: T,
  explanation: Explanation,
  additionalMeta: any = {}
) => ({
  ...data,
  _explanation: explanation,
  _meta: {
    explained: true,
    explanationVersion: '1.0',
    ...additionalMeta,
  },
});

export default {
  explainFraudDecision,
  explainVendorRecommendation,
  explainProductRecommendation,
  withExplanation,
};