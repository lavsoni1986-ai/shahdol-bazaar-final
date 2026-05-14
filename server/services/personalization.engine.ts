// @ts-nocheck
// 🔥 SELF-LEARNING AI: Feedback Loop
// User behavior → Vendor scores → Personalization

import { prisma } from "../storage";

export async function updateUserPreference(userId: number, vendorId: number, action: string, value: number = 1) {
  // Calculate preference score based on action
  let preferenceDelta = 0;

  switch (action) {
    case 'VIEW':
      preferenceDelta = 0.1; // Mild positive
      break;
    case 'CLICK':
      preferenceDelta = 0.3; // Strong positive
      break;
    case 'ADD_TO_CART':
      preferenceDelta = 0.5; // Very positive
      break;
    case 'ORDER':
      preferenceDelta = 1.0; // Maximum positive
      break;
    case 'REPEAT_ORDER':
      preferenceDelta = 1.2; // Loyalty bonus
      break;
    case 'RATE_VENDOR':
      preferenceDelta = value > 3 ? 0.8 : -0.5; // Rating-based
      break;
  }

  // Update or create user preference
  const existing = await prisma.userPreference.findUnique({
    where: { userId_vendorId: { userId, vendorId } }
  });

  if (existing) {
    const newScore = Math.max(-1, Math.min(1, existing.preferenceScore + preferenceDelta * 0.1));
    await prisma.userPreference.update({
      where: { userId_vendorId: { userId, vendorId } },
      data: {
        preferenceScore: newScore,
        interactionCount: { increment: 1 },
        lastInteraction: new Date()
      }
    });
  } else {
    await prisma.userPreference.create({
      data: {
        userId,
        vendorId,
        preferenceScore: preferenceDelta * 0.1,
        interactionCount: 1,
        lastInteraction: new Date()
      }
    });
  }
}

export async function getPersonalizedRecommendations(userId: number, districtId: number, limit: number = 10) {
  // Get user's preferences
  const userPrefs = await prisma.userPreference.findMany({
    where: { userId },
    orderBy: { preferenceScore: 'desc' },
    take: 20
  });

  if (userPrefs.length === 0) {
    // Fallback to regular ranking
    return prisma.vendor.findMany({
      where: { districtId, status: 'APPROVED', isShadowBanned: false },
      orderBy: { dsslScore: 'desc' },
      take: limit
    });
  }

  // Collaborative filtering: vendors similar to user's preferences
  const preferredVendors = userPrefs
    .filter(p => p.preferenceScore > 0.3)
    .map(p => p.vendorId);

  // Find users with similar preferences
  const similarUsers = await prisma.userPreference.findMany({
    where: {
      vendorId: { in: preferredVendors as number[] },
      userId: { not: userId },
      preferenceScore: { gt: 0.3 }
    },
    select: { userId: true },
    distinct: ['userId'],
    take: 50
  });

  const similarUserIds: number[] = similarUsers.map(u => u.userId).filter((id): id is number => id !== null);

  // Get recommendations from similar users
  const recommendations = await prisma.userPreference.findMany({
    where: {
      userId: { in: similarUserIds },
      vendorId: { notIn: preferredVendors as number[] },
      preferenceScore: { gt: 0.4 }
    },
    include: { vendor: true },
    orderBy: { preferenceScore: 'desc' },
    take: limit * 2
  });

  // Remove duplicates and sort by collective preference
  const vendorMap = new Map();

  recommendations.forEach(rec => {
    if (!vendorMap.has(rec.vendorId)) {
      vendorMap.set(rec.vendorId, {
        vendor: rec.vendor,
        score: rec.preferenceScore,
        count: 1
      });
    } else {
      const existing = vendorMap.get(rec.vendorId);
      existing.score = (existing.score * existing.count + rec.preferenceScore) / (existing.count + 1);
      existing.count += 1;
    }
  });

  // Convert to array and sort
  const personalizedVendors = Array.from(vendorMap.values())
    .filter(item => item.vendor.status === 'APPROVED' && !item.vendor.isShadowBanned)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.vendor);

  return personalizedVendors;
}
