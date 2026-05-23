// @ts-nocheck
import { prisma } from "../storage";
import { getTrustScore } from "./dssl.service";

export interface PolicyDecision {
  vendorId: number;
  action: 'boost' | 'restrict' | 'monitor' | 'suspend';
  reason: string;
  confidence: number;
  metrics: {
    sovereignScore: number;
    riskScore: number;
    errorRate: number;
  };
}

export const evaluateVendorPolicy = async (vendorId: number, districtId: number, mode: 'SAFE' | 'AGGRESSIVE' = 'SAFE', thresholds?: any): Promise<PolicyDecision> => {
  // Get current sovereign score
  const scoreResult = await getTrustScore(vendorId, districtId);
  const score = { total: scoreResult.score };

  // Calculate risk metrics
  const vendor = await prisma.vendor.findUnique({
    where: {
      id: vendorId, // ✅ Fixed: Use 'id' as primary key
    },
    include: {
      vendorMLProfile: true,
      _count: {
        select: {
          inquiries: {
            where: {
              status: "CANCELLED"
            }
          },
          products: true
        }
      }
    }
  });

  if (!vendor) {
    return {
      vendorId,
      action: 'restrict',
      reason: 'Vendor not found',
      confidence: 1.0,
      metrics: { sovereignScore: 0, riskScore: 1, errorRate: 1 }
    };
  }

  // 🚨 ANTI-MANIPULATION: Check fraud score first
  const fraudScore = vendor.fraudScore || 0;
  if (fraudScore > 70) {
    // High fraud suspicion - automatic restriction
    return {
      vendorId,
      action: 'suspend',
      reason: `ANTI-FRAUD: High fraud score (${fraudScore}) detected - possible manipulation`,
      confidence: 0.95,
      metrics: {
        sovereignScore: score.total,
        riskScore: 1,
        errorRate: 0.5
      }
    };
  }

  // 🔴 MINIMUM TRUST THRESHOLD: Use DB-configured thresholds or defaults
  const dsslScore = vendor.dsslScore || 0;
  const defaultThresholds = {
    suspend: mode === 'AGGRESSIVE' ? 30 : 20,
    restrict: mode === 'AGGRESSIVE' ? 50 : 40,
    boost: 80
  };
  const config = thresholds || defaultThresholds;
  const SUSPEND_THRESHOLD = config.suspend || defaultThresholds.suspend;
  const WARNING_THRESHOLD = config.restrict || defaultThresholds.restrict;
  const BOOST_THRESHOLD = config.boost || defaultThresholds.boost;

  // Risk score based on cancellations and low reliability (secondary)
  const cancellationRate = vendor._count.inquiries > 0 ?
    vendor._count.inquiries / vendor._count.inquiries : 0;
  const riskScore = (1 - (vendor.vendorMLProfile?.reliabilityScore || 0)) + cancellationRate * 0.5;

  // Error rate from AI insights
  const insights = await prisma.aIInsight.findMany({
    where: { vendorId },
    take: 20
  });
  const errorRate = insights.length > 0 ?
    insights.reduce((sum, i) => sum + (i.error || 0), 0) / insights.length : 0;

  // Decision logic based on DSSL thresholds
  let action: PolicyDecision['action'] = 'monitor';
  let reason = 'Standard monitoring - performance within acceptable range';

  if (score.total > 0.85 && (vendor.vendorMLProfile?.reliabilityScore || 0) > 0.9 && dsslScore > BOOST_THRESHOLD) {
    action = 'boost';
    reason = `Autonomous Promotion: High sovereign score (${score.total.toFixed(2)}), reliability, and DSSL (${dsslScore})`;
  } else if (dsslScore < WARNING_THRESHOLD || riskScore > 0.7 || errorRate > 0.15) {
    action = 'restrict';
    reason = `Warning: Low DSSL (${dsslScore}), high risk (${riskScore.toFixed(2)}), or error rate (${errorRate.toFixed(2)})`;
  }

  // Extreme cases - suspend only if DSSL is critically low
  if (dsslScore < SUSPEND_THRESHOLD || (riskScore > 0.9 && dsslScore < 50)) {
    action = 'suspend';
    reason = `Critical Penalization: DSSL critically low (${dsslScore}) or extreme risk with low trust`;
  }

  return {
    vendorId,
    action,
    reason,
    confidence: Math.min(1, (1 - errorRate) * score.total),
    metrics: {
      sovereignScore: score.total,
      riskScore,
      errorRate
    }
  };
};

// 🧾 BASIC ROLLBACK FUNCTION
export const rollbackPolicyAction = async (decision: PolicyDecision): Promise<void> => {
  try {
    // Reverse the action (basic implementation)
    const updates: any = {};

    switch (decision.action) {
      case 'boost':
        updates.boostedUntil = null;
        updates.trendingScore = { decrement: 50 };
        break;
      case 'restrict':
        updates.status = 'APPROVED'; // Restore to approved
        break;
      case 'suspend':
        updates.status = 'APPROVED'; // Restore to approved
        break;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.vendor.update({
        where: { id: decision.vendorId },
        data: updates
      });
    }

    console.log(`🔄 Rolled back action ${decision.action} for vendor ${decision.vendorId}`);
  } catch (error) {
    console.error(`❌ Failed to rollback action for vendor ${decision.vendorId}:`, error);
  }
};

export const executePolicyAction = async (decision: PolicyDecision, adminId?: number): Promise<void> => {
  let previousState: any = null;

  try {
    // Store previous state for rollback
    const vendor = await prisma.vendor.findUnique({
      where: { id: decision.vendorId },
      select: { status: true, boostedUntil: true, trendingScore: true }
    });
    previousState = vendor;

    const updates: any = {};

    switch (decision.action) {
      case 'boost':
        updates.boostedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days boost
        updates.trendingScore = { increment: 50 };
        break;
      case 'restrict':
        updates.status = 'PENDING'; // Move to pending for review
        updates.boostedUntil = null;
        break;
      case 'suspend':
        updates.status = 'REJECTED';
        updates.boostedUntil = null;
        break;
      case 'monitor':
        // No changes, just log
        break;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.vendor.update({
        where: {
          id: decision.vendorId, // ✅ Fixed: Use 'id' as primary key
        },
        data: updates
      });
    }

    // Log the decision
    await prisma.aIInsight.create({
      data: {
        vendorId: decision.vendorId,
        districtId: 1, // Assume district 1 for now
        predictedScore: decision.metrics.sovereignScore,
        reasoning: `Policy Action: ${decision.action} - ${decision.reason}`,
        error: decision.metrics.errorRate
      }
    });

    // 🔥 POLICY ACTION LOGGING: Log AI actions to admin audit trail
    if (adminId) {
      await prisma.adminLog.create({
        data: {
          adminId,
          action: `POLICY_${decision.action.toUpperCase()}`,
          targetId: decision.vendorId,
          details: decision.reason,
          meta: {
            sovereignScore: decision.metrics.sovereignScore,
            riskScore: decision.metrics.riskScore,
            errorRate: decision.metrics.errorRate,
            confidence: decision.confidence
          }
        }
      });
    }

  } catch (error) {
    // 🧾 ROLLBACK on failure
    console.error(`❌ Policy execution failed for vendor ${decision.vendorId}:`, error);

    if (previousState) {
      await prisma.vendor.update({
        where: { id: decision.vendorId },
        data: {
          status: previousState.status,
          boostedUntil: previousState.boostedUntil,
          trendingScore: previousState.trendingScore
        }
      });
      console.log(`🔄 Rolled back changes for vendor ${decision.vendorId}`);
    }

    throw error; // Re-throw to let caller handle
  }
};

export const scanAllVendors = async (districtId: number, mode: 'SAFE' | 'AGGRESSIVE' = 'SAFE'): Promise<PolicyDecision[]> => {
  // 🔥 FETCH DISTRICT-SPECIFIC THRESHOLDS
  const dsslConfig = await prisma.dsslConfig.findUnique({
    where: { districtId }
  });

  const thresholds = dsslConfig?.thresholds as any || {};

  const vendors = await prisma.vendor.findMany({
    where: { districtId },
    select: { id: true, status: true, userId: true }
  });

  const decisions: PolicyDecision[] = [];

  for (const vendor of vendors) {
    // ✅ Skip approved vendors - protect from auto suspension
    if (vendor.status === "APPROVED") {
      continue;
    }

    // ⚠️ Log vendors with no linked user but don't suspend
    if (!vendor.userId) {
      console.warn(`Vendor ${vendor.id} has no linked user. Skipping policy evaluation.`);
      continue;
    }

    const decision = await evaluateVendorPolicy(vendor.id, districtId, mode, thresholds);

    // 🟡 POLICY MODE SWITCH: Filter actions based on mode
    if (mode === 'SAFE' && (decision.action === 'suspend' || decision.action === 'restrict')) {
      // In SAFE mode, only warn - don't take action
      decision.action = 'monitor';
      decision.reason = `[SAFE MODE] ${decision.reason} - Action converted to monitoring only`;
    }

    decisions.push(decision);
  }

  return decisions;
};
