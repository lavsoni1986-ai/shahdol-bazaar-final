// @ts-nocheck
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../storage";
import { analyzeEventPatterns, predictVendorPerformance, predictMarketTrends } from "../../services/prediction.engine";
import { getTrustScore } from "../../services/dssl.service";
import { scanAllVendors, executePolicyAction } from "../../services/policy.engine";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { emitPolicySummary, emitSystemAlert } from "../../lib/realtime";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

// SAFE WRAPPER (MANDATORY)
const safe = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// AI Stats Summary
  router.get("/ai-stats", requireAuth, requireSuperAdmin, safe(async (req: Request, res: Response) => {
    const districtId = req.ctx?.districtId;
    if (!districtId) {
      return res.status(400).json({ success: false, error: "District context required" });
    }

    // Get vendor performance data
    const vendors = await prisma.vendor.findMany({
      where: { districtId },
      include: { vendorMLProfile: true }
    });

    const vendorStats = await Promise.all(
      vendors.map(async (v) => {
        const scoreResult = await getTrustScore(v.id, districtId);
        const prediction = await predictVendorPerformance(v.id, districtId);
        return {
          id: v.id,
          name: v.name,
          currentScore: scoreResult.score,
          predictedScore: 'status' in prediction ? 0 : prediction.nextMonthScore,
          reliability: v.vendorMLProfile?.reliabilityScore || 0,
          growthRate: v.vendorMLProfile?.growthRate || 0
        };
      })
    );

    // Get AI insights summary
    const insights = await prisma.aIInsight.findMany({
      where: { districtId },
      take: 100
    });

    const insightsStats = {
      total: insights.length,
      avgAccuracy: insights.length > 0
        ? insights.reduce((sum, i) => sum + (1 - (i.error || 0)), 0) / insights.length
        : 0,
      topPerformers: insights
        .sort((a, b) => (b.predictedScore - (b.actualOutcome || 0)) - (a.predictedScore - (a.actualOutcome || 0)))
        .slice(0, 5)
    };

    // Event patterns
    const patterns = await analyzeEventPatterns(districtId);

    // Market predictions
    const marketPredictions = await predictMarketTrends(districtId);

    res.json({
      vendorStats,
      insightsStats,
      patterns,
      marketPredictions,
      timestamp: new Date().toISOString()
    });
  }));

// Policy Scan
router.post("/policy-scan", requireAuth, requireSuperAdmin, safe(async (req: Request, res: Response) => {
  // ✅ SOVEREIGN FIX: Ensure districtId is a valid number
  const districtId = req.districtId;

  // 🛡️ [GUARD CLAUSE]: अगर जिला आईडी नहीं है, तो आगे न बढ़ें
  if (districtId === undefined || districtId === null) {
    return res.status(400).json({
      success: false,
      error: "District context missing. Sovereign scan requires a valid District ID."
    });
  }

  // अब districtId पक्का एक 'number' है, जिससे सारे एरर्स खत्म हो जाएंगे
  const execute = req.query.execute === 'true';
  const mode = (req.query.mode as 'SAFE' | 'AGGRESSIVE') || 'SAFE';

  // 🧯 EMERGENCY KILL SWITCH
  const killSwitch = await prisma.systemConfig.findUnique({
    where: { key: "POLICY_ENABLED" }
  });

  if (!(killSwitch?.value as any)?.enabled) {
    return res.json({
      success: false,
      message: "Policy engine disabled via emergency kill switch"
    });
  }

  // 🔒 SYSTEM LOCK (Prevent parallel runs)
  const lockKey = `POLICY_SCAN_${districtId}`;
  const existingLock = await prisma.systemLock.findUnique({
    where: { key: lockKey }
  });

  if (existingLock?.isActive) {
    return res.status(409).json({
      error: "Policy scan already running for this district"
    });
  }

  // Acquire lock
  await prisma.systemLock.upsert({
    where: { key: lockKey },
    update: {
      isActive: true,
      lockedAt: new Date(),
      lockedBy: req.user?.userId // ✅ Correct property access
    },
    create: {
      key: lockKey,
      isActive: true,
      lockedBy: req.user?.userId
    }
  });

  const decisions = await scanAllVendors(districtId, mode);

  let executed = 0;
  if (execute) {
    // 🚨 FAILSAFE SYSTEM: Multiple circuit breakers
    const EXECUTION_LIMIT = 10;
    const IMPACT_THRESHOLD_PERCENT = 20;
    const IMPACT_THRESHOLD_ABSOLUTE = 20;

    // Circuit breaker 1: Execution limit
    if (decisions.length > EXECUTION_LIMIT) {
      emitSystemAlert(districtId, {
        type: "FAILSAFE_TRIGGERED",
        message: `Execution blocked: Too many decisions (${decisions.length})`,
        severity: "CRITICAL",
        circuitBreaker: "EXECUTION_LIMIT"
      });
      return res.status(400).json({
        success: false,
        error: `FAILSAFE: Too many decisions (${decisions.length}). Maximum allowed: ${EXECUTION_LIMIT}`,
        message: "Policy execution blocked for safety"
      });
    }

    // Circuit breaker 2: Impact assessment (hybrid condition)
    const suspendCount = decisions.filter(d => d.action === 'suspend').length;
    const impactPercentage = (suspendCount / decisions.length) * 100;

    const exceedsPercentage = impactPercentage > IMPACT_THRESHOLD_PERCENT;
    const exceedsAbsolute = suspendCount > IMPACT_THRESHOLD_ABSOLUTE;

    if (exceedsPercentage || exceedsAbsolute) {
      emitSystemAlert(districtId, {
        type: "FAILSAFE_TRIGGERED",
        message: `Impact too high: ${suspendCount} suspensions (${impactPercentage.toFixed(1)}%)`,
        severity: "CRITICAL",
        circuitBreaker: "IMPACT_THRESHOLD"
      });
      return res.status(400).json({
        success: false,
        error: `FAILSAFE: Impact too high (${suspendCount} suspensions = ${impactPercentage.toFixed(1)}%). Thresholds: ${IMPACT_THRESHOLD_ABSOLUTE} absolute or ${IMPACT_THRESHOLD_PERCENT}%`,
        message: "Policy execution blocked - too many vendors would be suspended"
      });
    }

    // Circuit breaker 3: Fraud score check
    const highFraudDecisions = decisions.filter(d => d.reason.includes('ANTI-FRAUD'));
    if (highFraudDecisions.length > 3) {
      emitSystemAlert(districtId, {
        type: "FAILSAFE_TRIGGERED",
        message: `Multiple fraud detections (${highFraudDecisions.length}). Manual review required.`,
        severity: "CRITICAL",
        circuitBreaker: "FRAUD_DETECTION"
      });
      return res.status(400).json({
        success: false,
        error: `FAILSAFE: Multiple fraud detections (${highFraudDecisions.length}). Manual review required.`,
        message: "Policy execution blocked due to suspected manipulation"
      });
    }

    // Execute with monitoring
    for (const decision of decisions) {
      try {
        await executePolicyAction(decision, (req as any).user.id);
        executed++;
      } catch (error) {
        console.error(`❌ Policy execution failed for vendor ${decision.vendorId}:`, error);
      }
    }

    console.log(`✅ Policy execution complete: ${executed}/${decisions.length} actions executed`);

    // 🔥 REAL-TIME: Emit policy summary
    const summary = {
      executed,
      total: decisions.length,
      suspended: decisions.filter(d => d.action === 'suspend').length,
      restricted: decisions.filter(d => d.action === 'restrict').length,
      boosted: decisions.filter(d => d.action === 'boost').length,
      monitored: decisions.filter(d => d.action === 'monitor').length,
      timestamp: new Date().toISOString()
    };
    emitPolicySummary(districtId, summary);

    // 🔔 ALERTING SYSTEM (Minimum Viable)
    if (executed > 10) {
      console.warn(`⚠️ HIGH IMPACT: Policy execution affected ${executed} vendors in district ${districtId}`);
      emitSystemAlert(districtId, {
        type: "HIGH_IMPACT",
        message: `Policy execution affected ${executed} vendors`,
        severity: "WARNING",
        data: summary
      });
    }
  }

  // 🔓 Always release the lock
  await prisma.systemLock.update({
    where: { key: lockKey },
    data: { isActive: false }
  });

  res.json({
    success: true,
    executed,
    decisions,
    summary: {
      total: decisions.length,
      boosted: decisions.filter(d => d.action === 'boost').length,
      restricted: decisions.filter(d => d.action === 'restrict').length,
      suspended: decisions.filter(d => d.action === 'suspend').length,
      monitored: decisions.filter(d => d.action === 'monitor').length
    }
  });
}));

export default router;
