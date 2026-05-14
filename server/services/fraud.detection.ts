// 🔥 ANTI-MANIPULATION LAYER
// Prevents fake ratings, self-boosting, competitor sabotage

import { computeUserIntelligence } from './user.intelligence';

export async function calculateFraudScore(vendorId: number): Promise<number> {
  let fraudScore = 0;

  // 1. Abnormal Rating Spike Detection
  const recentReviews = await prisma.review.findMany({
    where: {
      vendorId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: { user: true }
  });

  const avgRating = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
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
    const count = userOrderCounts.get(order.userId) || 0;
    userOrderCounts.set(order.userId, count + 1);
  });

  const suspiciousUsers = Array.from(userOrderCounts.values()).filter(count => count > 5);
  fraudScore += suspiciousUsers.length * 15;

  // 3. IP Clustering (Bot network detection)
  const uniqueIPs = new Set(recentReviews.map(r => r.user?.lastLogin || 'unknown'));
  const ipClustering = uniqueIPs.size < recentReviews.length * 0.3; // Less than 30% unique IPs
  if (ipClustering) fraudScore += 25;

  // 4. Review Timing Patterns (Automated reviews)
  const reviewTimes = recentReviews.map(r => r.createdAt.getHours());
  const nightReviews = reviewTimes.filter(hour => hour >= 22 || hour <= 4).length;
  const nightReviewRatio = nightReviews / reviewTimes.length;
  if (nightReviewRatio > 0.6) fraudScore += 10; // Too many night reviews

  // 5. Content Similarity (Copy-paste reviews)
  const reviewTexts = recentReviews.map(r => r.comment || '').filter(text => text.length > 10);
  const duplicateReviews = reviewTexts.length - new Set(reviewTexts).size;
  const duplicateRatio = duplicateReviews / reviewTexts.length;
  if (duplicateRatio > 0.4) fraudScore += 30;

  // 6. User Trust Factor Integration
  const userIds = new Set([
    ...recentReviews.map(r => r.userId).filter(Boolean),
    ...recentOrders.map(o => o.userId).filter(Boolean)
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

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { fraudScore }
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
