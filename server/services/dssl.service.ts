import { prisma } from "../storage";

type DSSLConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface DSSLResult {
  score: number;
  confidence: DSSLConfidence;
  isFallback: boolean;
  degraded: boolean;
  statusMessage: string;
  ttl: number;
  lastCalculated?: Date;
  signalsUsed?: number;
}

// ============================================
// 🧠 DSSL (minimal, schema-safe)
// ============================================
export class DSSL {
  static getDistrictWeights(_districtId: number) {
    return {
      trust: 0.3,
      performance: 0.25,
      safety: 0.2,
      activity: 0.15,
      conversion: 0.1
    };
  }

  static detectFraud(
    product: any,
    districtId: number,
    districtAvgPrice: number
  ): { isFraud: boolean; riskLevel: "low" | "medium" | "high"; score: number; factors: string[] } {
    const weights = this.getDistrictWeights(districtId);
    const priceDeviation = districtAvgPrice > 0 ? (product?.price || 0) / districtAvgPrice : 1;
    const factors: string[] = [];

    let score = 0;
    if (priceDeviation > 5) {
      score += weights.trust * 1.5;
      factors.push(`Extreme price deviation (${priceDeviation.toFixed(1)}x)`);
    } else if (priceDeviation > 3) {
      score += weights.trust * 0.8;
      factors.push(`High price deviation (${priceDeviation.toFixed(1)}x)`);
    }

    if ((product?.vendor?.rating ?? 5) < 3) {
      score += weights.trust * 0.3;
      factors.push("Low vendor rating");
    }

    if ((product?.stock ?? 1) < 1) {
      score += weights.activity * 0.2;
      factors.push("No stock available");
    }

    const isFraud = score > 0.4;
    const riskLevel = score > 0.7 ? "high" : score > 0.4 ? "medium" : "low";
    return { isFraud, riskLevel, score, factors };
  }
}

// ============================================
// 📊 TRUST SCORE (schema-safe)
// ============================================
export function computeTrustScore(v: {
  avgRating: number;
  totalReviews?: number;
  verified: boolean;
  orderCount: number;
  fraudAlerts: number;
}) {
  const ratingPart = Math.min(40, v.avgRating * 8);
  const reviewPart = Math.min(20, v.totalReviews || 0);
  const verifiedPart = v.verified ? 20 : 0;
  const orderPart = Math.min(20, v.orderCount / 5);
  const fraudPenalty = Math.min(25, v.fraudAlerts * 5);

  const score = ratingPart + reviewPart + verifiedPart + orderPart - fraudPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const TRUST_TTL_MS = 5 * 60 * 1000;
const trustCache = new Map<number, { score: number; expiresAt: number }>();

async function computeVendorSignals(vendorId: number, districtId: number) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, districtId },
    select: {
      id: true,
      districtId: true,
      rating: true,
      isVerified: true,
      status: true,
      trustScore: true,
      dsslScore: true
    }
  });

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const [orderCount, productCount, reviewAgg, totalReviews, fraudAlerts] = await Promise.all([
    prisma.order.count({
      where: { vendorId, districtId }
    }),
    prisma.product.count({
      where: { vendorId, districtId, approved: true }
    }),
    prisma.review.aggregate({
      where: { isApproved: true, product: { vendorId, districtId } },
      _avg: { rating: true }
    }),
    prisma.review.count({
      where: { isApproved: true, product: { vendorId, districtId } }
    }),
    prisma.auditLog.count({
      where: {
        districtId,
        targetId: vendorId,
        action: { contains: "fraud", mode: "insensitive" }
      }
    })
  ]);

  const avgRating = Number(reviewAgg._avg.rating ?? vendor.rating ?? 0);

  return {
    vendor,
    metrics: {
      orderCount,
      productCount,
      avgRating,
      totalReviews,
      fraudAlerts
    }
  };
}

export async function getTrustScore(vendorId: number, districtId: number) {
  const now = Date.now();
  const cached = trustCache.get(vendorId);
  if (cached && cached.expiresAt > now) {
    return { score: cached.score, cached: true };
  }

  const { vendor, metrics } = await computeVendorSignals(vendorId, districtId);
  const score = computeTrustScore({
    avgRating: metrics.avgRating,
    totalReviews: metrics.totalReviews,
    verified: vendor.isVerified,
    orderCount: metrics.orderCount,
    fraudAlerts: metrics.fraudAlerts
  });

  trustCache.set(vendorId, { score, expiresAt: now + TRUST_TTL_MS });

  // Persist only schema-safe fields
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      trustScore: score,
      dsslScore: score,
      rating: metrics.avgRating
    }
  });

  return { score, cached: false };
}

export async function getBatchTrustScores(vendorIds: number[], districtId: number) {
  const results = await Promise.all(
    vendorIds.map((id) => getTrustScore(id, districtId).catch(() => ({ score: 0, cached: false })))
  );

  const trustMap: Record<number, { score: number; cached: boolean }> = {};
  vendorIds.forEach((id, index) => {
    trustMap[id] = results[index];
  });
  return trustMap;
}

export async function recomputeTrustScore(vendorId: number, districtId: number) {
  trustCache.delete(vendorId);
  const result = await getTrustScore(vendorId, districtId);
  return result.score;
}

// ============================================
// 🛡️ DSSL SERVICE (vendor score)
// ============================================
export class DSSLService {
  static async calculateVendorScore(
    vendorId: number,
    districtId: number
  ): Promise<{
    score: number;
    level: "sovereign_elite" | "growing_trust" | "under_review";
    color: string;
    message: string;
    insights: string[];
    breakdown: {
      trust: { score: number; max: number; label: string };
      performance: { score: number; max: number; label: string };
      safety: { score: number; max: number; label: string };
      activity: { score: number; max: number; label: string };
      responsiveness: { score: number; max: number; label: string };
    };
    metrics: {
      orderCount: number;
      productCount: number;
      avgRating: number;
      totalReviews: number;
      fraudAlerts: number;
      isVerified: boolean;
      status: string;
    };
  }> {
    const { vendor, metrics } = await computeVendorSignals(vendorId, districtId);

    const score = computeTrustScore({
      avgRating: metrics.avgRating,
      totalReviews: metrics.totalReviews,
      verified: vendor.isVerified,
      orderCount: metrics.orderCount,
      fraudAlerts: metrics.fraudAlerts
    });

    const level =
      score >= 80 ? "sovereign_elite" : score >= 50 ? "growing_trust" : "under_review";
    const color = score >= 80 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
    const message =
      level === "sovereign_elite"
        ? "High trust vendor"
        : level === "growing_trust"
          ? "Building trust"
          : "Under review";

    const insights: string[] = [];
    if (vendor.isVerified) insights.push("Verified vendor");
    if (metrics.fraudAlerts > 0) insights.push(`Fraud alerts: ${metrics.fraudAlerts}`);
    if (metrics.orderCount > 0) insights.push(`Orders: ${metrics.orderCount}`);
    if (metrics.totalReviews > 0) insights.push(`Reviews: ${metrics.totalReviews}`);

    return {
      score,
      level,
      color,
      message,
      insights,
      breakdown: {
        trust: { score: Math.min(40, Math.round(metrics.avgRating * 8)), max: 40, label: "Rating" },
        performance: { score: Math.min(20, Math.round(metrics.orderCount / 5)), max: 20, label: "Orders" },
        safety: { score: Math.max(0, 25 - Math.min(25, metrics.fraudAlerts * 5)), max: 25, label: "Fraud" },
        activity: { score: Math.min(15, metrics.productCount), max: 15, label: "Catalog" },
        responsiveness: { score: vendor.isVerified ? 20 : 0, max: 20, label: "Verified" }
      },
      metrics: {
        orderCount: metrics.orderCount,
        productCount: metrics.productCount,
        avgRating: metrics.avgRating,
        totalReviews: metrics.totalReviews,
        fraudAlerts: metrics.fraudAlerts,
        isVerified: vendor.isVerified,
        status: vendor.status
      }
    };
  }
}

