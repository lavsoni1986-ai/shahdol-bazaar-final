import { prisma } from '../storage';

let LOCKDOWN_MODE = false;

export const SystemLockdown = {
  async load() {
    const record = await prisma.systemLock.findFirst({
      where: { lockKey: "GLOBAL_LOCKDOWN" }
    });
    LOCKDOWN_MODE = record?.isActive || false;
  },

  isLocked() {
    return LOCKDOWN_MODE;
  },

  async enable(reason: string, adminId: number) {
    LOCKDOWN_MODE = true;

    await prisma.systemLock.upsert({
      where: { lockKey: "GLOBAL_LOCKDOWN" },
      update: {
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24h
        owner: String(adminId),
        metadata: { reason }
      },
      create: {
        lockKey: "GLOBAL_LOCKDOWN",
        lockType: "GLOBAL_LOCKDOWN",
        key: "GLOBAL_LOCKDOWN",
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        owner: String(adminId),
        metadata: { reason }
      },
    });
  },

  async disable(adminId: number) {
    LOCKDOWN_MODE = false;

    await prisma.systemLock.upsert({
      where: { lockKey: "GLOBAL_LOCKDOWN" },
      update: {
        isActive: false,
        expiresAt: new Date(),
        owner: String(adminId)
      },
      create: {
        lockKey: "GLOBAL_LOCKDOWN",
        lockType: "GLOBAL_LOCKDOWN",
        key: "GLOBAL_LOCKDOWN",
        isActive: false,
        expiresAt: new Date(),
        owner: String(adminId)
      },
    });
  },
};

// System lockdown mode during fraud spikes
export async function checkSystemLockdown(): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentFraudIncidents = await prisma.fraudHistory.count({
    where: {
      createdAt: { gte: oneHourAgo },
      riskScore: { gte: 50 }
    }
  });

  // Lockdown if > 20 high-risk incidents in last hour
  return recentFraudIncidents > 20;
}

// Priority alert queue
export async function getFalsePositiveMetrics(): Promise<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get total fraud detections today
  const fraudDetections = await prisma.fraudHistory.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  // Get admin overrides (false positives) today
  const falsePositives = await prisma.adminLog.count({
    where: {
      action: { in: ['USER_OVERRIDE', 'VENDOR_OVERRIDE'] },
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  const accuracy = fraudDetections > 0 ? ((fraudDetections - falsePositives) / fraudDetections * 100) : 100;

  return {
    fraudDetections,
    falsePositives,
    accuracy: Math.round(accuracy * 100) / 100
  };
}

export async function getPriorityAlerts(limit: number = 10): Promise<any[]> {
  const allIntel = await prisma.userIntelligence.findMany({
    include: {
      user: {
        select: { username: true, districtId: true }
      }
    }
  });

  const alerts = allIntel
    .map(intel => {
      const data = (intel.intelligenceData as any) || {};
      return {
        userId: intel.userId,
        username: intel.user.username,
        riskScore: data.riskScore || 0,
        trustScore: data.trustScore || 0,
        districtId: intel.user.districtId,
        priority: (data.riskScore || 0) >= 80 ? 'CRITICAL' :
                  (data.riskScore || 0) >= 60 ? 'HIGH' :
                  (data.riskScore || 0) >= 40 ? 'MEDIUM' : 'LOW',
        meta: data.meta || {}
      };
    })
    .filter(alert => alert.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);

  return alerts;
}

// Auto policy tuner
export async function autoTunePolicies(): Promise<void> {
  // Check false positive rate over last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const adminOverrides = await prisma.adminLog.count({
    where: {
      action: 'USER_OVERRIDE',
      createdAt: { gte: sevenDaysAgo }
    }
  });

  const totalActions = await prisma.adminLog.count({
    where: {
      action: { in: ['USER_BLOCK', 'USER_RESTRICT', 'USER_OVERRIDE'] },
      createdAt: { gte: sevenDaysAgo }
    }
  });

  if (totalActions > 10) {
    const falsePositiveRate = adminOverrides / totalActions;

    if (falsePositiveRate > 0.3) { // >30% false positives
      console.log('🔧 Auto-tuning: Relaxing thresholds due to high false positives');
      // In production, adjust risk thresholds in config
      // For now, just log
    }
  }
}

// Feedback loop - learn from admin overrides
export async function processAdminFeedback(adminId: number, userId: number, action: string, reason?: string): Promise<void> {
  // Log the override
  await prisma.adminLog.create({
    data: {
      adminId,
      action: 'USER_OVERRIDE',
      details: {
        targetId: userId,
        message: `Override: ${action} - ${reason || 'No reason'}`,
        reason,
        action
      }
    }
  });

  // Update user intelligence based on feedback
  const intel = await prisma.userIntelligence.findUnique({
    where: { userId }
  });

  if (intel) {
    const data = (intel.intelligenceData as any) || {};
    let adjustment = 0;
    if (action === 'UNBLOCK' || action === 'REDUCE_RESTRICTION') {
      adjustment = -10; // Reduce risk score
    } else if (action === 'BLOCK' || action === 'INCREASE_RESTRICTION') {
      adjustment = 10; // Increase risk score
    }

    const newRiskScore = Math.max(0, Math.min(100, (data.riskScore || 0) + adjustment));
    const newIntelligenceData = {
      ...data,
      riskScore: newRiskScore,
      meta: {
        ...(data.meta || {}),
        lastAdminFeedback: {
          adminId,
          action,
          reason,
          adjustment,
          timestamp: new Date().toISOString()
        }
      }
    };

    await prisma.userIntelligence.update({
      where: { userId },
      data: {
        intelligenceData: newIntelligenceData
      }
    });
  }
}
