import { prisma } from '../storage';

// Global user identity tracking
export async function getGlobalUserRisk(userId: number): Promise<number> {
  // For now, just return local risk. In production, aggregate across districts
  const intel = await prisma.userIntelligence.findUnique({
    where: { userId }
  });
  const data = (intel?.intelligenceData as any) || {};
  return data.riskScore || 0;
}

// Fairness normalization - district baseline
export async function getDistrictFairnessBaseline(districtId: number): Promise<number> {
  const intels = await prisma.userIntelligence.findMany({
    where: {
      user: {
        districtId,
        orders: { some: {} } // Has at least one order
      }
    }
  });
  if (intels.length === 0) return 50;
  const sum = intels.reduce((acc, curr) => {
    const data = (curr.intelligenceData as any) || {};
    return acc + (data.trustScore || 50);
  }, 0);
  return sum / intels.length;
}

export async function computeUserIntelligence(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { districtId: true, createdAt: true }
  });

  if (!user) return { trustScore: 0, riskScore: 100 };

  const orders = await prisma.order.count({ where: { userId } });
  const reviews = await prisma.review.count({ where: { userId } });
  const fraudHistory = await prisma.fraudHistory.count({ where: { userId } });

  const events = await prisma.userEvent.findMany({
    where: { userId },
    select: { deviceHash: true, ipAddress: true, sessionFingerprint: true, createdAt: true }
  });

  const deviceCount = new Set(events.map(e => e.deviceHash).filter(Boolean)).size || 1;
  const ipDiversity = new Set(events.map(e => e.ipAddress).filter(Boolean)).size || 1;

  // Session fingerprint analysis
  const fingerprintCount = new Set(events.map(e => e.sessionFingerprint).filter(Boolean)).size || 1;
  let fingerprintPenalty = 0;
  if (fingerprintCount > 3) {
    fingerprintPenalty = 25;
  }

  // User age for probation mode
  const userAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const isNewUser = userAgeDays < 3;

  // Dual Scoring System
  let trustScore =
    50 +
    orders * 2 +
    reviews -
    deviceCount * 2;

  let riskScore =
    fraudHistory * 20 +
    fingerprintPenalty;

  // Probation mode for new users
  if (isNewUser) {
    trustScore *= 0.5; // Reduce trust for new users
  }

  trustScore = Math.max(0, Math.min(100, trustScore));

  // Long-term drift detection (14-day trend)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentRiskHistory = await prisma.fraudHistory.findMany({
    where: {
      userId,
      createdAt: { gte: fourteenDaysAgo }
    },
    orderBy: { createdAt: 'asc' }
  });

  if (recentRiskHistory.length >= 7) { // At least a week's data
    const earlyRisk = recentRiskHistory.slice(0, 3).reduce((sum, h) => sum + h.riskScore, 0) / 3;
    const lateRisk = recentRiskHistory.slice(-3).reduce((sum, h) => sum + h.riskScore, 0) / 3;
    const drift = lateRisk - earlyRisk;
    if (drift > 10) { // Consistently rising risk
      riskScore += 20; // Slow coordinated attack penalty
    }
  }

  // Fairness normalization
  if (user.districtId) {
    const baselineTrust = await getDistrictFairnessBaseline(user.districtId);
    if (trustScore < baselineTrust * 0.5 && orders < 3) {
      // Soften penalties for low-activity genuine users
      riskScore = Math.max(0, riskScore - 30);
    }
  }

  // Global identity check
  const globalRisk = await getGlobalUserRisk(userId);
  if (globalRisk > 70) {
    riskScore = Math.max(riskScore, globalRisk);
  }

  // Behavior shift detection
  const existingIntel = await prisma.userIntelligence.findUnique({
    where: { userId }
  });

  let behaviorShiftPenalty = 0;
  if (existingIntel && existingIntel.updatedAt) {
    const data = (existingIntel.intelligenceData as any) || {};
    const daysSinceUpdate = (Date.now() - existingIntel.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate >= 7) {
      const trustVelocity = trustScore - (data.trustScore || 50);
      if (trustVelocity > 30) {
        riskScore += 20; // Trust velocity guard
      }

      // Check for sudden device changes
      const recentDevices = events.filter(e => e.createdAt > existingIntel.updatedAt).map(e => e.deviceHash);
      const oldDeviceCount = data.deviceCount || 1;
      if (recentDevices.length > 0 && deviceCount > oldDeviceCount + 2) {
        behaviorShiftPenalty = 25; // Identity shift detected
        riskScore += behaviorShiftPenalty;
      }
    }
  }

  // Progressive penalty for recovery abuse
  const fraudIncidents = fraudHistory;
  let maxTrustCap = 100;
  if (fraudIncidents > 3) {
    maxTrustCap = 60;
    trustScore = Math.min(trustScore, maxTrustCap);
    riskScore += 15;
  }

  trustScore = Math.max(0, Math.min(100, trustScore));
  riskScore = Math.max(0, Math.min(100, riskScore));

  return {
    trustScore,
    riskScore,
    deviceCount,
    ipDiversity,
    reviewCount: reviews,
    orderCount: orders,
    flaggedCount: fraudHistory,
    fingerprintPenalty,
    behaviorShiftPenalty,
    maxTrustCap,
    isNewUser,
    userAgeDays
  };
}

export async function checkRateLimit(userId: number): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentActions = await prisma.userEvent.count({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo }
    }
  });

  return recentActions > 10; // Rate limit: 10 actions per minute
}

export async function applyUserActions(userId: number) {
  // Rate limit check with probation mode consideration
  const intel = await computeUserIntelligence(userId);
  const isRateLimited = await checkRateLimit(userId);

  if (isRateLimited) {
    return {
      status: "RATE_LIMITED",
      rateLimited: true,
      message: "Too many actions in short time"
    };
  }

  // Probation mode restrictions
  if (intel.isNewUser) {
    // Additional restrictions for new users
    const recentReviews = await prisma.review.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentReviews >= 2) {
      return {
        status: "PROBATION_LIMITED",
        probationLimited: true,
        message: "New user probation: max 2 reviews per day"
      };
    }
  }

  let status = "NORMAL";

  if (intel.riskScore > 80) status = "BLOCKED";
  else if (intel.riskScore > 60) status = "QUARANTINE";
  else if (intel.riskScore > 40) status = "MONITORED";
  else if (intel.isNewUser) status = "PROBATION";

  // Get recent flags and linked vendors for explainability
  const recentFlags = await prisma.fraudHistory.findMany({
    where: { userId },
    select: { riskScore: true, details: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const linkedVendors = await prisma.order.findMany({
    where: { userId },
    select: { vendorId: true },
    distinct: ['vendorId'],
    take: 10
  });

  // Get vendor details
  const vendorIds = linkedVendors.map(o => o.vendorId).filter((id): id is number => id !== null);
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, name: true }
  });

  const meta = {
    trustBreakdown: {
      orders: intel.orderCount || 0,
      reviews: intel.reviewCount || 0,
      devices: intel.deviceCount || 0,
      ipDiversity: intel.ipDiversity || 0,
      fraudHistory: intel.flaggedCount || 0,
      fingerprintPenalty: intel.fingerprintPenalty || 0,
      behaviorShiftPenalty: intel.behaviorShiftPenalty || 0,
      maxTrustCap: intel.maxTrustCap || 100,
      isNewUser: intel.isNewUser || false,
      userAgeDays: intel.userAgeDays || 0
    },
    recentFlags,
    linkedVendors: vendors,
    fairnessApplied: (intel.orderCount || 0) < 3 && intel.trustScore < 50
  };

  const intelligenceData = {
    trustScore: intel.trustScore,
    riskScore: intel.riskScore,
    reviewCount: intel.reviewCount,
    orderCount: intel.orderCount,
    flaggedCount: intel.flaggedCount,
    deviceCount: intel.deviceCount,
    ipDiversity: intel.ipDiversity,
    meta,
    lastActive: new Date().toISOString()
  };

  // Update or create UserIntelligence record
  await prisma.userIntelligence.upsert({
    where: { userId },
    update: {
      intelligenceData
    },
    create: {
      userId,
      intelligenceData
    }
  });

  return { status, ...intel };
}