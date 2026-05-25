// 🔥 ANTI-MANIPULATION LAYER
// Prevents fake ratings, self-boosting, competitor sabotage

import { computeUserIntelligence } from './user.intelligence';
import { prisma } from '../storage';

export async function calculateFraudScore(vendorId: number): Promise<number> {
  let fraudScore = 0;

  // 1. Abnormal Rating Spike Detection
  const recentReviews = await prisma.review.findMany({
    where: {
      product: {
        vendorId
      },
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: { user: true }
  });

  const avgRating = recentReviews.length > 0
    ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
    : 0;
  const ratingSpike = avgRating > 4.5 && recentReviews.length > 10;
  if (ratingSpike) fraudScore += 20;

  // 2. Same User Multiple Orders (Self-boosting)
  const userOrderCounts = new Map<number, number>();
  const recentOrders = await prisma.order.findMany({
    where: {
      vendorId,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }
  });

  recentOrders.forEach(order => {
    if (order.userId !== null) {
      const count = userOrderCounts.get(order.userId) || 0;
      userOrderCounts.set(order.userId, count + 1);
    }
  });

  const suspiciousUsers = Array.from(userOrderCounts.values()).filter(count => count > 5);
  fraudScore += suspiciousUsers.length * 15;

  // 3. IP Clustering (Bot network detection)
  const reviewerIds = recentReviews.map(r => r.userId).filter((id): id is number => id !== null);
  const userEvents = reviewerIds.length > 0 ? await prisma.userEvent.findMany({
    where: {
      userId: { in: reviewerIds }
    },
    select: { userId: true, ipAddress: true }
  }) : [];

  const userIpMap = new Map<number, string>();
  userEvents.forEach(ue => {
    if (ue.ipAddress && ue.userId !== null) {
      userIpMap.set(ue.userId, ue.ipAddress);
    }
  });

  const uniqueIPs = new Set(recentReviews.map(r => (r.userId ? userIpMap.get(r.userId) : null) || 'unknown'));
  const ipClustering = uniqueIPs.size < recentReviews.length * 0.3; // Less than 30% unique IPs
  if (ipClustering && recentReviews.length > 0) fraudScore += 25;

  // 4. Review Timing Patterns (Automated reviews)
  const reviewTimes = recentReviews.map(r => r.createdAt.getHours());
  const nightReviews = reviewTimes.filter(hour => hour >= 22 || hour <= 4).length;
  const nightReviewRatio = reviewTimes.length > 0 ? nightReviews / reviewTimes.length : 0;
  if (nightReviewRatio > 0.6 && reviewTimes.length > 0) fraudScore += 10; // Too many night reviews

  // 5. Content Similarity (Copy-paste reviews)
  const reviewTexts = recentReviews.map(r => r.comment || '').filter(text => text.length > 10);
  const duplicateReviews = reviewTexts.length - new Set(reviewTexts).size;
  const duplicateRatio = reviewTexts.length > 0 ? duplicateReviews / reviewTexts.length : 0;
  if (duplicateRatio > 0.4 && reviewTexts.length > 0) fraudScore += 30;

  // 6. User Trust Factor Integration
  const userIds = new Set<number>([
    ...recentReviews.map(r => r.userId).filter((id): id is number => id !== null),
    ...recentOrders.map(o => o.userId).filter((id): id is number => id !== null)
  ]);

  for (const userId of userIds) {
    if (userId) {
      const intel = await computeUserIntelligence(userId);
      if (intel.trustScore < 30) {
        fraudScore += 20;
      }
    }
  }

  // Cap at 100
  return Math.min(100, fraudScore);
}

export async function updateVendorFraudScore(vendorId: number): Promise<void> {
  const fraudScore = await calculateFraudScore(vendorId);

  await prisma.fraudHistory.create({
    data: {
      vendorId,
      eventType: 'RATING_MANIPULATION',
      riskScore: fraudScore,
      details: { message: `Calculated fraud score from reviews and orders: ${fraudScore}` }
    }
  });
}

export async function updateAllFraudScores(): Promise<void> {
  console.log('🔍 Updating fraud scores for all vendors...');

  const vendors = await prisma.vendor.findMany({ select: { id: true } });
  let updated = 0;

  for (const vendor of vendors) {
    await updateVendorFraudScore(vendor.id);
    updated++;
  }

  console.log(`✅ Updated fraud scores for ${updated} vendors`);
}
