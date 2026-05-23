/**
 * ============================================
 * AI DASHBOARD API ROUTES - BharatOS Admin
 * ============================================
 * Endpoints for AI explainability dashboard
 *
 * Provides:
 * - Fraud analysis data
 * - Trend analytics
 * - System health metrics
 * - AI decision explanations
 */

import { Router, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";

interface GraphNode {
  id: string;
  label: string;
  type: 'vendor' | 'user';
  risk: number;
}
import { prisma } from "../../storage";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { success, failure } from "../../lib/apiResponse";
import { explainFraudDecision, explainVendorRecommendation } from "../../lib/aiExplainability";
import { isValidJsonValue } from "../../lib/guards";

function asJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!isValidJsonValue(value) || value === null) return null;
  return typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function jsonString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

declare global {
  namespace Express {
    interface Request {
      ctx?: {
        role?: string;
        districtId?: number;
        userId?: number;
        requestId?: string;
      };
      districtId?: number;
      districtSlug?: string;
      user?: unknown;
    }
  }
}

// Define the exact shape BharatOS expects
type SovereignVendor = Prisma.VendorGetPayload<{
  include: { vendorMLProfile: true }
}>;

const router = Router();

// Apply admin authentication to all routes
router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/ai/fraud-analysis/:vendorId
 * Get detailed fraud analysis for a specific vendor
 */
router.get("/fraud-analysis/:vendorId", async (req: Request, res: Response) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    if (isNaN(vendorId)) {
      return res.status(400).json(failure("VALIDATION_ERROR", "Invalid vendor ID", undefined));
    }

    const [vendor, fraudHistory] = await Promise.all([
      prisma.vendor.findUnique({ where: { id: vendorId } }),
      prisma.fraudHistory.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    if (!vendor) {
      return res.json({ success: true, data: null });
    }

    if (fraudHistory.length === 0) {
      return res.json({ success: true, data: { explanation: "No fraud data available", score: 0 } });
    }

    // Get latest fraud analysis from history
    const latestAnalysis = fraudHistory[0];
    if (!latestAnalysis) {
      return res.status(404).json(failure("NOT_FOUND", "No fraud analysis available for this vendor", undefined));
    }

    const latestDetails = asJsonRecord(latestAnalysis.details);

    // Generate explanation
    const explanation = explainFraudDecision(
      latestAnalysis.riskScore,
      75, // Mock anomaly score - would come from stored analysis
      ["unusual_timing"], // Mock patterns - would come from stored analysis
      ["sudden_rating_increase"], // Mock flags - would come from stored analysis
      fraudHistory.slice(0, 7).map(h => ({ score: h.riskScore, createdAt: h.createdAt }))
    );

    const response = {
      vendorId: vendor.id,
      vendorName: vendor.name,
      fraudScore: latestAnalysis.riskScore,
      riskLevel: latestAnalysis.riskScore >= 80 ? 'CRITICAL' :
        latestAnalysis.riskScore >= 60 ? 'HIGH' :
          latestAnalysis.riskScore >= 40 ? 'MEDIUM' : 'LOW',
      explanation,
      lastAnalyzed: latestAnalysis.createdAt,
      analysisHistory: fraudHistory.map(h => ({
        score: h.riskScore,
        flags: asJsonRecord(h.details)?.flags,
        analyzedAt: h.createdAt
      }))
    };

    return success(res, response);
  } catch (error) {
    console.error("Fraud analysis API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch fraud analysis", undefined));
  }
});

/**
 * GET /api/admin/ai/trends
 * Get AI trend analytics for the platform
 */
router.get("/trends", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const districtId = req.ctx?.districtId;

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Avoid Prisma `groupBy` type recursion; aggregate in-process while keeping the same output shape.
    const fraudRows = await prisma.fraudHistory.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(districtId && { vendor: { districtId } }),
      },
      select: { createdAt: true, riskScore: true },
      orderBy: { createdAt: "asc" },
    });

    const fraudByDate = new Map<string, { sum: number; count: number }>();
    for (const row of fraudRows) {
      const dateStr = row.createdAt.toISOString().split("T")[0];
      const existing = fraudByDate.get(dateStr) ?? { sum: 0, count: 0 };
      existing.sum += row.riskScore;
      existing.count += 1;
      fraudByDate.set(dateStr, existing);
    }

    // Get vendor trust scores (DSSL scores)
    const trustTrends = await prisma.vendor.groupBy({
      by: ['updatedAt'],
      where: {
        updatedAt: {
          gte: startDate
        },
        ...(districtId && { districtId })
      },
      _avg: {
        dsslScore: true
      },
      orderBy: {
        updatedAt: 'asc'
      }
    });

    // Format response
    const dates = [];
    const fraudScores = [];
    const trustScores = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];

      dates.push(dateStr);

      const fraudAgg = fraudByDate.get(dateStr);
      fraudScores.push(fraudAgg && fraudAgg.count > 0 ? fraudAgg.sum / fraudAgg.count : 0);

      // Find matching trust data
      const trustData = trustTrends.find(t =>
        t.updatedAt.toISOString().split('T')[0] === dateStr
      );
      trustScores.push(trustData?._avg.dsslScore || 0);
    }

    const response = {
      period: `${days} days`,
      districtId,
      data: {
        dates,
        fraudScores,
        trustScores,
        totalAnalyses: Array.from(fraudByDate.values()).reduce((sum, v) => sum + v.count, 0)
      },
      insights: {
        avgFraudScore: fraudScores.reduce((a, b) => a + b, 0) / fraudScores.length,
        avgTrustScore: trustScores.reduce((a, b) => a + b, 0) / trustScores.length,
        trend: fraudScores[fraudScores.length - 1] > fraudScores[0] ? 'increasing' : 'decreasing'
      }
    };

    return success(res, response);
  } catch (error) {
    console.error("Trends API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch trend data", undefined));
  }
});

router.get("/rankings", async (req: Request, res: Response) => {
  try {
    const districtId = req.districtId ?? undefined;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // Get top-ranked vendors by DSSL score
    const vendors = await prisma.vendor.findMany({
      where: {
        districtId,
        status: 'APPROVED',
        isShadowBanned: false
      },
      include: {
        vendorMLProfile: true,
      },
      orderBy: [
        { dsslScore: 'desc' },
        { rating: 'desc' }
      ],
      take: limit
    });

    // Generate explanations for each vendor
    const rankingsWithExplanations = await Promise.all(
      vendors.map(async (vendor, index) => {
        const totalOrders = await prisma.order.count({ where: { vendorId: vendor.id } });
        const explanation = explainVendorRecommendation(
          vendor,
          index + 1,
          vendors.length,
          {} // Empty user preferences for admin view
        );

        return {
          rank: index + 1,
          vendor: {
            id: vendor.id,
            name: vendor.name,
            dsslScore: vendor.dsslScore,
            rating: vendor.rating,
            totalOrders,
            category: vendor.businessType
          },
        };
      })
    );

    return success(res, {
      districtId,
      rankings: rankingsWithExplanations,
      totalVendors: vendors.length
    });
  } catch (error) {
    console.error("Rankings API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch ranking data", undefined));
  }
});

router.get("/health", async (req: Request, res: Response) => {
  try {
    // Get overall system metrics
    const [
      totalVendors,
      totalUsers,
      totalOrders,
      recentFraudAnalyses,
      systemAlerts
    ] = await Promise.all([
      prisma.vendor.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.fraudHistory.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: { riskScore: true }
      }),
      prisma.adminLog.findMany({
        where: {
          action: 'FRAUD_ALERT',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calculate health metrics
    const avgFraudScore = recentFraudAnalyses.length > 0
      ? recentFraudAnalyses.reduce((sum, a) => sum + a.riskScore, 0) / recentFraudAnalyses.length
      : 0;

    const highRiskVendors = recentFraudAnalyses.filter(a => a.riskScore >= 70).length;
    const criticalVendors = recentFraudAnalyses.filter(a => a.riskScore >= 80).length;

    // Generate insights
    const insights = [];
    if (avgFraudScore > 50) {
      insights.push("⚠️ Average fraud score elevated - increase monitoring");
    } else {
      insights.push("✅ Fraud scores within normal range");
    }

    if (criticalVendors > 0) {
      insights.push(`🚨 ${criticalVendors} vendors flagged as critical risk`);
    }

    if (highRiskVendors > totalVendors * 0.1) {
      insights.push("⚠️ High-risk vendor ratio above 10%");
    }

    const response = {
      overallHealth: Math.max(0, 100 - (avgFraudScore * 0.8)),
      metrics: {
        totalVendors,
        totalUsers,
        totalOrders,
        avgFraudScore: Math.round(avgFraudScore),
        highRiskVendors,
        criticalVendors,
        analysesLast24h: recentFraudAnalyses.length,
        activeAlerts: systemAlerts.length
      },
      insights,
      recentAlerts: systemAlerts.map(alert => ({
        id: alert.id,
        message: alert.details,
        severity: jsonString(asJsonRecord(alert.details)?.severity) ?? 'medium',
        timestamp: alert.createdAt
      }))
    };

    return success(res, response);
  } catch (error) {
    console.error("Health API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch system health data", undefined));
  }
});

router.get("/vendor-insights/:vendorId", async (req: Request, res: Response) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    if (isNaN(vendorId)) {
      return res.status(400).json(failure("VALIDATION_ERROR", "Invalid vendor ID", undefined));
    }

    const [vendor, fraudHistory, orders] = await Promise.all([
      prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { vendorMLProfile: true },
      }),
      prisma.fraudHistory.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.order.findMany({
        where: { vendorId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!vendor) {
      return res.json({ success: true, data: null });
    }

    // Generate AI insights
    const insights = {
      fraudAnalysis: fraudHistory.length > 0 ? {
        currentScore: fraudHistory[0].riskScore,
        trend: fraudHistory.length > 1
          ? (fraudHistory[0].riskScore > fraudHistory[1].riskScore ? 'increasing' : 'decreasing')
          : 'stable',
        riskLevel: fraudHistory[0].riskScore >= 80 ? 'CRITICAL' :
          fraudHistory[0].riskScore >= 60 ? 'HIGH' :
            fraudHistory[0].riskScore >= 40 ? 'MEDIUM' : 'LOW'
      } : null,

      performance: {
        totalOrders: orders.length,
        totalProducts: 0,
        avgOrderValue: orders.length > 0
          ? orders.reduce((sum, order) => sum + Number(order.totalPrice), 0) / orders.length
          : 0,
        conversionRate: 0,
        repeatCustomerRate: 0
      },

      aiRecommendations: [] as string[],
      riskFactors: [] as string[],
      opportunities: [] as string[]
    };

    // Generate recommendations based on data
    if (insights.fraudAnalysis?.riskLevel === 'CRITICAL') {
      insights.aiRecommendations.push("Immediate suspension recommended");
      insights.aiRecommendations.push("Manual admin review required");
    } else if (insights.fraudAnalysis?.riskLevel === 'HIGH') {
      insights.aiRecommendations.push("Enhanced monitoring activated");
      insights.aiRecommendations.push("Transaction limits applied");
    }

    if (insights.performance.conversionRate < 0.2) {
      insights.opportunities.push("Low conversion rate - consider pricing optimization");
    }

    if (insights.performance.repeatCustomerRate > 0.3) {
      insights.opportunities.push("Strong repeat customer base - leverage loyalty programs");
    }

    return success(res, {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        status: vendor.status,
        dsslScore: vendor.dsslScore,
        category: vendor.businessType
      },
      insights,
      lastUpdated: vendor.updatedAt
    });
  } catch (error) {
    console.error("Vendor insights API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch vendor insights", undefined));
  }
});

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    // 🔥 DEBUG: Log district context
    console.log("🔍 [METRICS] District ID:", req.districtId, "District Slug:", req.districtSlug);

    // Get real metrics from database - FILTERED BY DISTRICT
    const districtFilter = req.districtId ? { districtId: req.districtId } : {};

    const [
      fraudStats,
      vendorStats,
      userStats
    ] = await Promise.all([
      prisma.fraudHistory.aggregate({
        _avg: { riskScore: true },
        _count: { _all: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          // Filter fraud by district if vendor has district
          vendor: districtFilter
        }
      }),
      prisma.vendor.aggregate({
        _count: true,
        _avg: { dsslScore: true },
        where: districtFilter
      }),
      prisma.user.count({
        where: districtFilter
      })
    ]);

    // 🔥 DEBUG: Log actual counts
    console.log("🔍 [METRICS] Vendor count:", vendorStats._count, "User count:", userStats);

    const fraudCount = fraudStats._count._all;
    const response = {
      fraudAccuracy: 91, // Mock - would calculate from actual fraud detection accuracy
      falsePositiveRate: Math.round((fraudCount * 0.08)), // Mock calculation
      avgTrustScore: Math.round(vendorStats._avg.dsslScore || 0),
      activeThreats: Math.round(fraudCount * 0.12), // Mock calculation
      systemHealth: 96 // Mock system health
    };

    return success(res, response);
  } catch (error) {
    console.error("Metrics API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch metrics", undefined));
  }
});

router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // Get recent critical alerts from admin logs
    const alerts = await prisma.adminLog.findMany({
      where: {
        action: 'FRAUD_ALERT',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Transform to alert format
    const formattedAlerts = alerts.map((alert, index) => {
      const detailsText = jsonString(alert.details);
      const detailsObj = asJsonRecord(alert.details);
      const titleFromDetails = detailsText?.split(":")[0] ?? jsonString(detailsObj?.title);
      const entityId = detailsObj && (typeof detailsObj.vendorId === "number" || typeof detailsObj.vendorId === "string")
        ? String(detailsObj.vendorId)
        : undefined;

      return ({
        id: alert.id.toString(),
        severity: index < 2 ? 'CRITICAL' : index < 5 ? 'HIGH' : 'MEDIUM' as const,
        title: titleFromDetails || 'Fraud Alert',
        description: detailsText || 'Suspicious activity detected',
        confidence: 0.8 + Math.random() * 0.15, // Mock confidence
        reasons: [
          'Unusual activity pattern',
          'Behavioral anomaly detected',
          'Risk score threshold exceeded'
        ],
        timestamp: alert.createdAt.toISOString(),
        entityId,
        entityType: 'vendor'
      });
    });

    return success(res, formattedAlerts);
  } catch (error) {
    console.error("Alerts API error:", error);
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch alerts", undefined));
  }
});

router.get("/fraud-network", async (req: Request, res: Response) => {
  try {
    // Get vendors with high fraud scores
    const highRiskVendors = await prisma.vendor.findMany({
      where: {
        status: 'APPROVED'
      },
      select: {
        id: true,
        name: true,
      },
      take: 20
    });

    const vendorIds = highRiskVendors.map(v => v.id);
    const latestFraudByVendor = vendorIds.length
      ? await prisma.fraudHistory.findMany({
        where: { vendorId: { in: vendorIds } },
        orderBy: { createdAt: "desc" },
        select: { vendorId: true, riskScore: true },
        take: vendorIds.length,
      })
      : [];
    const riskScoreByVendor = new Map<number, number>();
    for (const row of latestFraudByVendor) {
      if (!riskScoreByVendor.has(row.vendorId)) riskScoreByVendor.set(row.vendorId, row.riskScore);
    }

    // Create network data
    const nodes: GraphNode[] = highRiskVendors.map((vendor, index) => ({
      id: vendor.id.toString(),
      label: vendor.name.substring(0, 15),
      type: 'vendor' as const,
      risk: riskScoreByVendor.get(vendor.id) ?? 50
    }));

    // Add some user nodes
    for (let i = 0; i < 5; i++) {
      nodes.push({
        id: `user_${i}`,
        label: `User ${i + 1}`,
        type: 'user' as const,
        risk: 30 + Math.random() * 40
      });
    }

    // Add IP nodes
    for (let i = 0; i < 3; i++) {
      nodes.push({
        id: `ip_${i}`,
        label: `IP ${i + 1}`,
        type: 'user' as const,
        risk: 20 + Math.random() * 30
      });
    }

    // Create links between nodes
    const links: Array<{
      source: string | number;
      target: string | number;
      type: 'review' | 'ip_shared';
      strength: number;
    }> = [];
    nodes.forEach((node, index) => {
      if (node.type === 'vendor' && Math.random() > 0.7) {
        // Connect vendor to random user
        const userNodes = nodes.filter(n => n.type === 'user');
        if (userNodes.length > 0) {
          const randomUser = userNodes[Math.floor(Math.random() * userNodes.length)];
          links.push({
            source: node.id,
            target: randomUser.id,
            type: 'review' as const,
            strength: Math.floor(Math.random() * 5) + 1
          });
        }
      }

      if (node.type === 'user' && Math.random() > 0.8) {
        // Connect user to IP
        const ipNodes = nodes.filter(n => n.type === 'user' && n.label.startsWith('IP'));
        if (ipNodes.length > 0) {
          const randomIp = ipNodes[Math.floor(Math.random() * ipNodes.length)];
          links.push({
            source: node.id,
            target: randomIp.id,
            type: 'ip_shared' as const,
            strength: Math.floor(Math.random() * 3) + 1
          });
        }
      }
    });

    const response = {
      nodes,
      links,
      metadata: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        lastUpdated: new Date().toISOString()
      }
    };

    return success(res, response);
  } catch (error) {
    res.status(500).json(failure("SERVER_ERROR", "Failed to fetch network data", undefined));
  }
});

router.post("/policy-simulate", async (req: Request, res: Response) => {
  try {
    const { threshold } = req.body;

    if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
      return res.status(400).json(failure("VALIDATION_ERROR", "Invalid threshold value", undefined));
    }

    // Mock impact calculation based on threshold
    const baseImpact = (70 - threshold) / 40; // 70 is current threshold
    const vendorsAffected = Math.max(0, Math.round(baseImpact * 25));
    const falsePositives = Math.max(0, Math.round(baseImpact * 8));
    const revenueImpact = -Math.round(baseImpact * 35000); // Negative means loss

    const response = {
      currentThreshold: 70,
      proposedThreshold: threshold,
      impact: {
        vendorsAffected,
        falsePositives,
        revenueImpact
      }
    };

    return success(res, response);
  } catch (error) {
    res.status(500).json(failure("SERVER_ERROR", "Failed to simulate policy", undefined));
  }
});

export default router;
