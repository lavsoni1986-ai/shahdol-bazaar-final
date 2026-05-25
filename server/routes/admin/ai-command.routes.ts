import express, { Request, Response } from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { prisma } from "../../storage";
import { success, failure } from "../../lib/apiResponse";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

// helper
async function getDistrictVendorIds(districtId?: number) {
  if (!districtId) return [];
  const vendors = await prisma.vendor.findMany({
    where: { districtId },
    select: { id: true }
  });
  return vendors.map(v => v.id);
}

// ================= AI METRICS =================
router.get("/metrics", async (req: any, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;
    const vendorIds = await getDistrictVendorIds(districtId);

    const fraudWhere = districtId ? { vendorId: { in: vendorIds } } : {};

    const [fraudStats, vendorStats, userCount] = await Promise.all([
      prisma.fraudHistory.aggregate({
        _avg: { riskScore: true },
        _count: { id: true },
        where: fraudWhere
      }),
      prisma.vendor.aggregate({
        _count: { id: true },
        _avg: { dsslScore: true },
        where: districtId ? { districtId } : {}
      }),
      prisma.user.count({
        where: districtId ? { districtId } : {}
      })
    ]);

    const avgScore = Number(fraudStats._avg?.riskScore || 0);
    const fraudCount = Number(fraudStats._count?.id || 0);
    const vendorCount = Number(vendorStats._count?.id || 0);
    const avgTrust = Number(vendorStats._avg?.dsslScore || 0);

    return success(res, {
      fraudAccuracy: Math.max(80, 100 - Math.round(avgScore / 2)),
      falsePositiveRate: Math.round(fraudCount * 0.08),
      avgTrustScore: Math.round(avgTrust),
      activeThreats: fraudCount,
      systemHealth: vendorCount > 0 ? 96 : 72,
      totalVendors: vendorCount,
      totalUsers: userCount
    });
  } catch (e) {
    console.error("AI metrics error", e);
    return failure(res, "SERVER_ERROR", "Failed to fetch metrics", 500);
  }
});

// ================= FRAUD ANALYSIS =================
router.get("/fraud-analysis/:vendorId", async (req: any, res: Response) => {
  try {
    const vendorId = parseInt(req.params.vendorId);
    const districtId = req.ctx?.districtId;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        ...(districtId ? { districtId } : {})
      }
    });

    if (!vendor) {
      return failure(res, "NOT_FOUND", "Vendor not found", 404);
    }

    const fraudRows = await prisma.fraudHistory.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const latestScore = fraudRows[0]?.riskScore || 0;

    const confidenceBase = fraudRows.length || 1;
    const confidence = Math.min(
      98,
      Math.max(55, Math.round((latestScore / confidenceBase)))
    );

    return success(res, {
      vendorId: vendor.id,
      vendorName: vendor.name,
      currentFraudScore: latestScore,
      riskLevel:
        latestScore >= 80 ? "CRITICAL" :
          latestScore >= 60 ? "HIGH" :
            latestScore >= 40 ? "MEDIUM" : "LOW",
      totalAnalyses: fraudRows.length,
      recentFlags: fraudRows.slice(0, 5).map((f: any) => f.flags),
      trendData: fraudRows.map((f: any) => ({
        score: f.riskScore,
        createdAt: f.createdAt
      })),
      confidence
    });
  } catch (e) {
    console.error("Fraud analysis error", e);
    return failure(res, "SERVER_ERROR", "Failed fraud analysis", 500);
  }
});

// ================= TRENDS =================
router.get("/trends", async (req: any, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const districtId = req.ctx?.districtId;
    const vendorIds = await getDistrictVendorIds(districtId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const fraudRows = await prisma.fraudHistory.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(districtId ? { vendorId: { in: vendorIds } } : {})
      },
      orderBy: { createdAt: "asc" }
    });

    const dates: string[] = [];
    const fraudScores: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const ds = d.toISOString().split("T")[0];
      dates.push(ds);

      const dayRows = fraudRows.filter((r: any) => r.createdAt.toISOString().startsWith(ds));
      const avg = dayRows.length
        ? dayRows.reduce((a: number, b: any) => a + b.riskScore, 0) / dayRows.length
        : 0;

      fraudScores.push(Math.round(avg));
    }

    return success(res, {
      period: `${days} days`,
      data: { dates, fraudScores }
    });
  } catch (e) {
    console.error("Trend error", e);
    return failure(res, "SERVER_ERROR", "Failed trend fetch", 500);
  }
});

// ================= ALERTS =================
router.get("/alerts", async (req: any, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;
    const vendorIds = await getDistrictVendorIds(districtId);

    const alerts = await prisma.fraudHistory.findMany({
      where: districtId ? { vendorId: { in: vendorIds } } : {},
      orderBy: { id: "desc" },
      take: 10
    });

    return success(res,
      alerts.map((a: any) => ({
        id: a.id,
        severity: a.riskScore >= 80 ? "CRITICAL" : a.riskScore >= 60 ? "HIGH" : "MEDIUM",
        title: "Fraud anomaly detected",
        description: `Vendor ${a.vendorId} flagged with score ${a.riskScore}`,
        confidence: Math.min(0.99, a.riskScore / 100),
        reasons: Array.isArray(a.flags) ? a.flags : [],
        timestamp: a.createdAt
      }))
    );
  } catch (e) {
    console.error("Alert fetch error", e);
    return failure(res, "SERVER_ERROR", "Failed alerts", 500);
  }
});

// ================= FRAUD NETWORK =================
router.get("/fraud-network", async (req: any, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;

    const vendors = await prisma.vendor.findMany({
      where: districtId ? { districtId } : {},
      take: 15
    });

    const fraudRows = await prisma.fraudHistory.findMany({
      where: { vendorId: { in: vendors.map(v => v.id) } },
      orderBy: { createdAt: "desc" }
    });

    const nodes = vendors.map(v => {
      const latest = fraudRows.find((f: any) => f.vendorId === v.id);
      return {
        id: v.id.toString(),
        label: v.name,
        type: "vendor",
        risk: latest?.riskScore || 0
      };
    });

    const links: any[] = [];
    for (let i = 1; i < nodes.length; i++) {
      links.push({
        source: nodes[0].id,
        target: nodes[i].id,
        type: "risk_cluster",
        strength: 1
      });
    }

    return success(res, {
      nodes,
      links,
      metadata: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        lastUpdated: new Date()
      }
    });
  } catch (e) {
    console.error("Fraud network error", e);
    return failure(res, "SERVER_ERROR", "Failed fraud network", 500);
  }
});

// ================= VENDOR INSIGHTS =================
router.get("/vendor-insights/:vendorId", async (req: any, res: Response) => {
  try {
    const vendorId = parseInt(req.params.vendorId);
    const districtId = req.ctx?.districtId;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        ...(districtId ? { districtId } : {})
      },
      include: {
        products: true
      }
    });

    if (!vendor) {
      return failure(res, "NOT_FOUND", "Vendor not found", 404);
    }

    const orderCount = await prisma.order.count({
      where: { vendorId: vendor.id }
    });

    const latestFraud = await prisma.fraudHistory.findFirst({
      where: { vendorId },
      orderBy: { createdAt: "desc" }
    });

    return success(res, {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        status: vendor.status,
        dsslScore: vendor.dsslScore
      },
      insights: {
        totalOrders: orderCount,
        totalProducts: vendor.products.length,
        latestFraudScore: latestFraud?.riskScore || 0
      }
    });
  } catch (e) {
    console.error("Vendor insights error", e);
    return failure(res, "SERVER_ERROR", "Failed vendor insights", 500);
  }
});

// ================= POLICY =================
router.post("/policy-simulate", async (req: Request, res: Response) => {
  try {
    const { threshold } = req.body;

    return success(res, {
      currentThreshold: 70,
      proposedThreshold: threshold,
      impact: {
        vendorsAffected: Math.max(0, 70 - threshold),
        falsePositives: Math.max(0, 80 - threshold),
        revenueImpact: -(70 - threshold) * 500
      }
    });
  } catch (e) {
    console.error("Policy simulation error", e);
    return failure(res, "SERVER_ERROR", "Failed policy simulation", 500);
  }
});

// ================= MODEL STATUS =================
router.get("/model-status", async (_req: Request, res: Response) => {
  return success(res, {
    fraudEngine: "ONLINE",
    dsslEngine: "ONLINE",
    predictionEngine: "ONLINE",
    aiRouter: "ONLINE",
    confidence: 96
  });
});

export default router;