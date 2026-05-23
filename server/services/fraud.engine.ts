// @ts-nocheck
import { prisma } from '../storage';
import { computeBehaviorProfile } from './fraud.behavior';
import { detectAnomalies } from './fraud.anomaly';
import { matchFraudPatterns, saveFraudPattern } from './fraud.pattern';
import { explainFraudDecision } from '../lib/aiExplainability';
import { isValidJsonValue } from '../lib/guards';

// Standardized fraud context builder
async function buildFraudContext(vendor: any, profile: any) {
  const anomaly = detectAnomalies(profile);
  const patternMatch = await matchFraudPatterns(profile);
  const safeConversionRate = isValidJsonValue(profile.conversionRate) && typeof profile.conversionRate === 'number' ? profile.conversionRate : 0;
  const safeRepeatRate = isValidJsonValue(profile.repeatRate) && typeof profile.repeatRate === 'number' ? profile.repeatRate : 0;
  const fraudScore = Math.min(100, anomaly.score * 0.6 + (1 - safeConversionRate) * 20 + (1 - safeRepeatRate) * 20 + patternMatch.scoreBoost);
  const adjustedScore = fraudScore + anomaly.score;
  const status = adjustedScore > 80 ? "SUSPENDED" : adjustedScore > 60 ? "RESTRICTED" : adjustedScore > 40 ? "MONITORED" : "NORMAL";
  const reasons = [...anomaly.flags, ...(patternMatch.matched.length > 0 ? [`Pattern match: ${patternMatch.matched.join(', ')}`] : [])];

  return {
    fraudScore,
    anomaly,
    patternMatch,
    adjustedScore,
    status,
    reasons,
    safeConversionRate,
    safeRepeatRate
  };
}

// Context awareness helper
async function checkHighTrafficPeriod(districtId: number): Promise<boolean> {
  // Check for festivals, holidays, or high-traffic events
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Example: Diwali, Holi, etc. (simplified)
  const highTrafficDays = [
    { month: 10, day: 31 }, // Diwali approx
    { month: 3, day: 14 },  // Holi approx
    // Add more festival dates
  ];

  return highTrafficDays.some(h => h.month === month && h.day === day);
}

export async function calculateFraudScore(vendorId: number) {
  const profile = await computeBehaviorProfile(vendorId);
  const anomaly = detectAnomalies(profile);

  const patternMatch = await matchFraudPatterns(profile);

  const safeConversionRate = isValidJsonValue(profile.conversionRate) && typeof profile.conversionRate === 'number' ? profile.conversionRate : 0;
  const safeRepeatRate = isValidJsonValue(profile.repeatRate) && typeof profile.repeatRate === 'number' ? profile.repeatRate : 0;

  const finalScore =
    anomaly.score * 0.6 +
    (1 - safeConversionRate) * 20 +
    (1 - safeRepeatRate) * 20 +
    patternMatch.scoreBoost;

  return {
    fraudScore: Math.min(100, finalScore),
    flags: [...anomaly.flags, ...(patternMatch.matched.length > 0 ? [`Pattern match: ${patternMatch.matched.join(', ')}`] : [])],
    profile,
    anomaly
  };
}

export async function applyFraudActions(vendorId: number) {
  const suspendThreshold = 80;
  const restrictThreshold = 60;
  const monitorThreshold = 40;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { districtId: true, dsslScore: true }
    });

    if (!vendor) return;

    const profile = await computeBehaviorProfile(vendorId);
    const context = await buildFraudContext(vendor, profile);

    const relaxationFactor = 1;
    let finalScore = context.adjustedScore;

    if (context.patternMatch?.matched && context.patternMatch.matched.length > 0) {
      finalScore += 10;
    }

    let status = context.status;

    // Pattern memory: Check historical scores
    const history = await prisma.fraudHistory.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    let anomalyMultiplier = 1;
    if (history.length >= 3) {
      const avgPast = history.reduce((a, b) => a + b.score, 0) / history.length;
      if (context.fraudScore > avgPast * 1.5) {
        anomalyMultiplier = 1.2; // Increase sensitivity for sudden changes
        context.reasons.push("Sudden score increase from history");
      }

      // Detect slow fraud: Gradual increase over time
      const sortedHistory = history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const trend = sortedHistory.slice(-3).every((h, i, arr) => i === 0 || h.score >= arr[i - 1].score);
      if (trend && context.fraudScore > 40) {
        anomalyMultiplier *= 1.1;
        context.reasons.push("Gradual suspicious trend detected");
      }
    }

    // Auto learning: Save pattern if high fraud score (with safeguards)
    if (finalScore > 85 && context.safeRepeatRate < 0.1 && vendor.districtId) {
      await saveFraudPattern(profile, finalScore, vendor.districtId, context.safeRepeatRate);
    }

    // Save to history
    await prisma.fraudHistory.create({
      data: {
        vendorId,
        score: context.fraudScore,
        flags: context.reasons
      }
    });

    // Controlled trust decay
    let dsslUpdate = undefined;
    if (context.adjustedScore > 70) {
      const decay = Math.min(10, context.adjustedScore * 0.05);
      const newDssl = Math.max(20, vendor.dsslScore - decay);
      dsslUpdate = newDssl;
    }

    // Recovery system: If fraud score low for 7 days, gradually restore trust
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentHighScores = await prisma.fraudHistory.count({
      where: {
        vendorId,
        score: { gt: 30 },
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // Prevent recovery exploit: Slow down if multiple fraud incidents in history
    const totalFraudIncidents = await prisma.fraudHistory.count({
      where: {
        vendorId,
        score: { gt: 60 }
      }
    });

    const recoverySpeed = totalFraudIncidents > 3 ? 1 : 2; // Half speed if repeat offender

    if (recentHighScores === 0 && finalScore < 30 && vendor.dsslScore < 80) {
      // Gradual recovery: increase by recoverySpeed points if consistently low
      dsslUpdate = Math.min(100, vendor.dsslScore + recoverySpeed);
      context.reasons.push("Trust recovery initiated");
    }

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        fraudScore: finalScore,
        isShadowBanned: status === "SUSPENDED",
        ...(dsslUpdate !== undefined && { dsslScore: dsslUpdate })
      }
    });

    // Detailed explainability
    const anomalyBreakdown = {
      anomalyScore: context.anomaly.score,
      conversionPenalty: (1 - context.safeConversionRate) * 20,
      repeatPenalty: (1 - context.safeRepeatRate) * 20,
      patternBoost: context.patternMatch.scoreBoost,
      historicalMultiplier: anomalyMultiplier,
      contextRelaxation: relaxationFactor
    };

    await prisma.adminActionLog.create({
      data: {
        adminId: null,
        action: "FRAUD_ANALYSIS",
        details: {
          targetId: vendorId,
          targetType: "vendor",
          decision: status,
          reason: context.reasons.join(", "),
          evidence: {
            fraudScore: finalScore,
            originalScore: context.fraudScore,
            thresholds: { suspend: suspendThreshold, restrict: restrictThreshold, monitor: monitorThreshold },
            reasons: context.reasons,
            matchedPatterns: context.patternMatch.matched,
            anomalyBreakdown
          },
          districtId: vendor.districtId || null
        }
      }
    });

    // Realtime alerts with cooldown (5 min)
    if (finalScore > restrictThreshold) {
      const recentAlert = await prisma.adminActionLog.findFirst({
        where: {
          action: "FRAUD_ALERT",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
      });

      if (!recentAlert) {
        await prisma.adminActionLog.create({
          data: {
            adminId: null,
            action: "FRAUD_ALERT",
            details: {
              targetId: vendorId,
              targetType: "vendor",
              decision: status,
              reason: `Fraud alert: Score ${finalScore}, Status: ${status}`,
              evidence: { fraudScore: finalScore, reasons: context.reasons },
              districtId: vendor.districtId || null
            }
          }
        });

        const io = (global as any).io;
        if (io) {
          io.emit("fraud:alert", {
            vendorId,
            fraudScore: finalScore,
            reasons: context.reasons,
            status
          });
        }
      }
    }

    // Generate AI explanation for the fraud decision
    const explanation = explainFraudDecision(
      context.fraudScore,
      context.anomaly.score,
      context.patternMatch.matched,
      context.anomaly.flags,
      history.map(h => ({ score: h.score, createdAt: h.createdAt }))
    );

    // AI Observability Log
    console.log("🧠 Fraud Analysis:", {
      vendorId,
      fraudScore: finalScore,
      status,
      signals: {
        anomalyScore: context.anomaly.score,
        patternMatches: context.patternMatch.matched,
        behaviorFlags: context.anomaly.flags
      },
      timestamp: new Date().toISOString()
    });

    return {
      fraudScore: finalScore,
      status,
      reasons: context.reasons,
      explanation,
      _meta: {
        analyzed: true,
        confidence: explanation.confidence,
        riskLevel: explanation.riskLevel,
        analysisTimestamp: new Date().toISOString()
      }
    };
  } catch (err) {
    console.error("Fraud analysis error:", err);
  }
}
