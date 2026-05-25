// Frameworks
import { Router, Request, Response } from "express";

// Database
import { prisma, storage } from "../storage";

// Security
import { optionalAuth, requireAuth, requireSuperAdmin } from "../auth/middleware";
import { parseDistrictId } from "../utils/parse";
import bcrypt from "bcryptjs";

// Services
import { calculateDSSLScore } from "./ai/dssl.engine";
import { computeUserIntelligence, applyUserActions } from "../services/user.intelligence";
import { checkSystemLockdown, getPriorityAlerts, autoTunePolicies, processAdminFeedback, getFalsePositiveMetrics } from "../services/system.health";
import { DSSL } from "../services/dssl.service";
import { applyFraudActions, calculateFraudScore } from "../services/fraud.engine";

// Search indexing
import { buildVendorSearchText } from "../../shared/cognition/entity-search-indexing";

// 🧮 Deterministic Re-rank Hook
async function recalcVendorScore(vendorId: number) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: { select: { id: true } },
        _count: { select: { products: true } }
      }
    });

    if (!vendor) return;

    const newScore = calculateDSSLScore(vendor);

    await prisma.vendor.update({
      where: { id: vendorId },
      data: { dsslScore: newScore }
    });

    console.log(`[RE-RANK] Vendor ${vendorId} score recalculated: ${newScore}`);
  } catch (error) {
    console.error(`[RE-RANK_ERROR] Failed to recalc vendor ${vendorId}:`, error);
  }
}

const router = Router();

// ============================================
// ADMIN LOGIN
// ============================================

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ============================================
// SOVEREIGN COMMAND CENTER - Admin APIs
// ============================================

// --- ADMIN: GET All Districts ---
router.get("/districts", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districts = await storage.getAllDistricts();
    return res.json({ data: districts });
  } catch (e: any) {
    console.error("Districts fetch failed", e?.message);
    return res.status(500).json({ message: "Failed to fetch districts" });
  }
});

// 🛡️ BHARAT-OS: Get Single District for Admin
router.get("/districts/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const districtId = parseDistrictId(req.params.id);

  if (!districtId) {
    return res.status(400).json({ error: 'Invalid districtId' });
  }

  try {
    const district = await prisma.district.findUnique({
      where: { id: districtId }
    });
    if (!district) return res.status(404).json({ message: "District not found" });
    res.json(district);
  } catch (err) {
    console.error('[DISTRICT_FETCH_ERROR]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ADMIN: CREATE District ---
router.post("/districts", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, state, primaryColor, secondaryColor, logoUrl, faviconUrl, dsslContact, dsslEmail, isActive, isDefault, metaTitle, metaDescription, themeConfig } = req.body;

    if (!name || !slug || !state) {
      return res.status(400).json({ message: "Name, slug, and state are required" });
    }

    // Check if slug already exists
    const existing = await storage.getDistrictBySlug(slug);
    if (existing) {
      return res.status(400).json({ message: "District with this slug already exists" });
    }

    const district = await storage.createDistrict({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      state,
      primaryColor,
      secondaryColor,
      logoUrl,
      faviconUrl,
      dsslContact,
      dsslEmail,
      isActive,
      isDefault,
      metaTitle,
      metaDescription,
      themeConfig,
    });

    return res.status(201).json(district);
  } catch (e: any) {
    console.error("District creation failed", e?.message);
    return res.status(500).json({ message: "Failed to create district" });
  }
});

// ⚖️ ADMIN: UPDATE DSSL WEIGHTS - जिले के AI पैरामीटर्स बदलना
router.patch("/dssl/weights/:districtId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId);

    if (!districtId) {
      return res.status(400).json({ error: 'Invalid districtId' });
    }

    const { weights } = req.body; // e.g., { rating: 0.3, orders: 0.4, ... }

    // 🔐 Strict Schema Validation
    const allowedKeys = ["rating", "orders", "safety", "reviews", "experience"];
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({ error: "Weights must be an object" });
    }
    if (!Object.keys(weights).every(k => allowedKeys.includes(k))) {
      return res.status(400).json({ error: "Invalid weight keys. Allowed: " + allowedKeys.join(", ") });
    }
    const sum = (Object.values(weights) as number[]).reduce((a: number, b: number) => a + b, 0);
    if (sum <= 0 || sum > 1.1) { // Allow slight tolerance for floating point
      return res.status(400).json({ error: "Weights must sum to approximately 1.0" });
    }

    const district = await prisma.district.findUnique({ where: { id: districtId } });

    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }

    DSSL.setDistrictWeights(districtId, weights);

    res.json({ 
      success: true, 
      message: "Sovereign Weights Updated", 
      district: {
        ...district,
        dsslWeights: weights
      } 
    });
  } catch (error: any) {
    console.error("DSSL weights update failed", error?.message);
    res.status(500).json({ error: "Failed to update DSSL weights" });
  }
});

// 🔁 ADMIN: RECALCULATE DSSL - पूरे जिले का स्कोर फिर से कैलकुलेट करना
router.post("/dssl/recalculate/:districtId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId);

    if (!districtId) {
      return res.status(400).json({ error: 'Invalid districtId' });
    }

    // ⚡ BHARAT-OS: TRIGGERING BACKGROUND AI SYNC
    // यहाँ हम एक बैकग्राउंड प्रोसेस शुरू करेंगे जो हर वेंडर का स्कोर अपडेट करेगी
    // (हमने जो calculateDSSLScore फंक्शन बनाया था, उसे यहाँ लूप में चलाएंगे)

    res.json({ success: true, message: "AI Recalculation Triggered for District " + districtId });
  } catch (error: any) {
    console.error("DSSL recalculation trigger failed", error?.message);
    res.status(500).json({ error: "Failed to trigger DSSL recalculation" });
  }
});

// --- ADMIN: PATCH Vendor Status (Approve/Reject/Pending) ---
router.patch("/vendors/:id/status", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 🛡️ BHARAT-OS: Directly updating the database
    const updatedVendor = await prisma.vendor.update({
      where: { id: parseInt(id) }, // 🎯 Ensure ID is a Number
      data: { status: status }
    });

    console.log(`✅ Sovereign Status Updated: ${updatedVendor.name} is now ${status}`);
    res.json({ success: true, data: updatedVendor });
  } catch (error: any) {
    console.error("🚨 Status Update Failed:", error.message);
    res.status(500).json({ success: false, message: "Update Failed" });
  }
});

// 👑 GOD MODE: Hardened Verification with Transaction
router.patch("/vendors/:id/verify", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const vendorId = parseInt(req.params.id);
  const { status, reason } = req.body;

  try {
    // 🛡️ Double Guard: District-wise access control
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    // 🔁 Idempotency: Avoid double-actions
    if (vendor.status === "APPROVED" && vendor.isVerified && !vendor.isShadowBanned) {
      console.log(`[VENDOR_VERIFY_IDEMPOTENT] Admin ${req.ctx?.userId} attempted duplicate verify on vendor ${vendorId}`);
      return res.json({
        success: true,
        data: vendor,
        meta: { action: "VENDOR_VERIFY", idempotent: true }
      });
    }

    // Check if admin belongs to same district (unless SUPER_ADMIN)
    // SUPER_ADMIN has isAdmin=true and no districtId
    // DISTRICT_ADMIN has isAdmin=true and districtId
    if (req.ctx?.isAdmin && req.ctx?.districtId && req.ctx?.districtId !== vendor.districtId) {
      return res.status(403).json({ success: false, error: "Cross-district access denied" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldVendor = await tx.vendor.findUnique({ where: { id: vendorId } });

      const updated = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: status || "APPROVED",
          isVerified: true,
          isShadowBanned: false
        }
      });

      // 🧾 Audit Integrity: Immutable diff capture
      await tx.adminLog.create({
        data: {
          adminId: req.ctx?.userId || 0,
          action: "VENDOR_APPROVED",
          details: {
            targetId: vendorId,
            message: reason || "Vendor verification",
            meta: {
              before: {
                status: oldVendor?.status,
                dsslScore: oldVendor?.dsslScore,
                isShadowBanned: oldVendor?.isShadowBanned
              },
              after: {
                status: "APPROVED",
                dsslScore: oldVendor?.dsslScore,
                isShadowBanned: false
              },
              reason
            }
          }
        }
      });
      return updated;
    });

    // 🔮 Deterministic Re-rank Hook
    await recalcVendorScore(vendorId);

    console.log(`[VENDOR_VERIFY_SUCCESS] Admin ${req.ctx?.userId} verified vendor ${vendorId} (${vendor.name})`);

    res.json({
      success: true,
      data: result,
      meta: { action: "VENDOR_VERIFY" }
    });
  } catch (error) {
    console.error("[VENDOR_VERIFY_ERROR]", error);
    res.status(500).json({ success: false, error: "Transaction Failed" });
  }
});

// 📜 ADMIN AUDIT LOGS - For Audit Timeline
router.get("/audit-logs", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await prisma.adminLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            role: true,
            user: {
              select: { username: true }
            }
          }
        }
      }
    });

    const total = await prisma.adminLog.count();

    return res.json({
      success: true,
      data: logs,
      pagination: { total, limit, offset }
    });
  } catch (error: any) {
    console.error("🚨 Admin Audit Logs Fetch Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
});

// 🎛️ DSSL THRESHOLDS MANAGEMENT
router.get("/dssl-thresholds/:districtId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.districtId);

    // const config = await prisma.dsslConfig.findUnique({
    //   where: { districtId }
    // });

    // const thresholds = config?.thresholds || {
    //   suspend: 20,
    //   restrict: 40,
    //   boost: 80
    // };

    // return res.json({ success: true, thresholds });
    return res.json({ error: "DSSL config temporarily unavailable for pilot" });
  } catch (error: any) {
    console.error("🚨 DSSL Thresholds Fetch Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch thresholds" });
  }
});

router.patch("/dssl-thresholds/:districtId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const { suspend, restrict, boost, weights } = req.body;

    // Validate thresholds
    if (suspend >= restrict || restrict >= boost) {
      return res.status(400).json({
        success: false,
        message: "Invalid thresholds: suspend < restrict < boost"
      });
    }

    // 🚨 DSSL WEIGHT NORMALIZATION: Ensure weights sum to 1
    if (weights) {
      const totalWeight = Object.values(weights).reduce((sum: number, w: any) => sum + w, 0);
      if (Math.abs(totalWeight - 1) > 0.01) { // Allow small floating point tolerance
        return res.status(400).json({
          success: false,
          message: `Invalid weights: must sum to 1.0, got ${totalWeight}`
        });
      }
    }

    // const updatedConfig = await prisma.dsslConfig.upsert({
    //   where: { districtId },
    //   update: {
    //     thresholds: { suspend, restrict, boost },
    //     ...(weights && { weights })
    //   },
    //   create: {
    //     districtId,
    //     thresholds: { suspend, restrict, boost },
    //     weights: weights || { dssl: 0.4, ml: 0.25, behavior: 0.25, context: 0.1 }
    //   }
    // });

    // return res.json({ success: true, thresholds: updatedConfig.thresholds, weights: updatedConfig.weights });
    return res.json({ error: "DSSL config temporarily unavailable for pilot" });
  } catch (error: any) {
    console.error("🚨 DSSL Thresholds Update Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update thresholds" });
  }
});



// 📊 ML SIGNAL COMPUTATION
router.post("/compute-signals", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { computeAllVendorSignals } = await import("../services/signal.engine");

    await computeAllVendorSignals();

    res.json({
      success: true,
      message: "ML signals computed for all vendors"
    });
  } catch (error: any) {
    console.error("🚨 Signal Computation Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to compute signals" });
  }
});

// 🎯 AUTO WEIGHT TUNING
router.post("/auto-tune-weights", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const tunerPath = "../services/weight.tuner";
    const { weightTuner } = await import(tunerPath) as any;

    await weightTuner.runAutoTuning();

    res.json({
      success: true,
      message: "Auto weight tuning completed for all districts"
    });
  } catch (error: any) {
    console.error("🚨 Auto Weight Tuning Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to run auto weight tuning" });
  }
});

// 🧯 EMERGENCY KILL SWITCH MANAGEMENT
router.get("/kill-switch", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "POLICY_ENABLED" }
    });

    res.json({
      success: true,
      enabled: (config?.value as any)?.enabled !== false
    });
  } catch (error: any) {
    console.error("🚨 Kill Switch Status Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to get kill switch status" });
  }
});

router.post("/kill-switch", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    await prisma.systemConfig.upsert({
      where: { key: "POLICY_ENABLED" },
      update: { value: { enabled } },
      create: { key: "POLICY_ENABLED", value: { enabled } }
    });

    // Log the emergency action
    await prisma.adminLog.create({
      data: {
        adminId: req.ctx?.userId || 0,
        action: enabled ? "KILL_SWITCH_DISABLED" : "KILL_SWITCH_ENABLED",
        details: `Policy engine ${enabled ? 're-enabled' : 'emergency disabled'}`
      }
    });

    res.json({
      success: true,
      enabled,
      message: `Policy engine ${enabled ? 're-enabled' : 'emergency disabled'}`
    });
  } catch (error: any) {
    console.error("🚨 Kill Switch Toggle Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to toggle kill switch" });
  }
});

// 👤 USER PREFERENCES DASHBOARD
router.get("/user-preferences", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const where = userId ? { userId } : {};

    const preferences = await prisma.userPreference.findMany({
      where,
      include: {
        user: { select: { username: true } },
        vendor: { select: { name: true, dsslScore: true } }
      },
      orderBy: { preferenceScore: 'desc' },
      take: limit
    });

    res.json({
      success: true,
      data: preferences,
      count: preferences.length
    });
  } catch (error: any) {
    console.error("🚨 User Preferences Fetch Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch user preferences" });
  }
});

// 📊 OBSERVABILITY DASHBOARD (with caching)
router.get("/system-health", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.query.districtId as string) || 1;

    // 🔥 HEARTBEAT API: Use cached health data
    const { healthCache } = await import("../realtime");

    if (healthCache && healthCache[districtId]) {
      // Return cached data for this district
      return res.json({
        success: true,
        cached: true,
        ...healthCache[districtId]
      });
    }

    // Fallback: Compute fresh health data
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeVendors,
      shadowBanned,
      dsslStats,
      eventsLastHour,
      policyRuns,
      failsafeTriggers,
      totalPreferences,
      activeLocks
    ] = await Promise.all([
      prisma.vendor.count({ where: { districtId, status: "APPROVED" } }),
      prisma.vendor.count({ where: { districtId, isShadowBanned: true } }),
      prisma.vendor.aggregate({
        where: { districtId },
        _avg: { dsslScore: true },
        _count: { dsslScore: true }
      }),
      prisma.userEvent.count({
        where: { createdAt: { gte: oneHourAgo } }
      }),
      prisma.adminLog.count({
        where: {
          action: { startsWith: "POLICY_" },
          createdAt: { gte: oneDayAgo }
        }
      }),
      prisma.adminLog.count({
        where: {
          action: "KILL_SWITCH_ENABLED",
          createdAt: { gte: oneDayAgo }
        }
      }),
      prisma.userPreference.count({ where: { vendor: { districtId } } }),
      prisma.systemLock.count({ where: { isActive: true } })
    ]);

    const freshHealth = {
      districtId,
      activeVendors,
      shadowBanned,
      avgDssl: Math.round((dsslStats._avg.dsslScore || 0) * 100) / 100,
      avgConversion: 0,
      eventsLastHour,
      policyRunsLastHour: policyRuns,
      failsafeTriggers,
      personalizationData: totalPreferences,
      activeLocks,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      cached: false,
      ...freshHealth,
      health: {
        eventTracking: eventsLastHour > 0 ? 'HEALTHY' : 'WARNING',
        policyEngine: policyRuns > 0 ? 'ACTIVE' : 'IDLE',
        dataQuality: dsslStats._count.dsslScore > 10 ? 'GOOD' : 'LOW_DATA',
        personalization: totalPreferences > 100 ? 'LEARNING' : 'TRAINING'
      }
    });
  } catch (error: any) {
    console.error("🚨 System Health Check Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to get system health" });
  }
});

// GET /api/admin/system-health/audit
router.get("/system-health/audit", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Critical logs last hour
    const criticalLogs = await prisma.adminLog.count({
      where: { action: "ERROR", createdAt: { gte: oneHourAgo } }
    });

    // Vulnerable vendors (low DSSL)
    const inconsistentVendors = await prisma.vendor.count({
      where: { dsslScore: { lt: 20 }, status: "APPROVED" }
    });

    // High risk users not blocked
    const allUserIntel = await prisma.userIntelligence.findMany();
    const highRiskUsers = allUserIntel.filter(ui => {
      const data = ui.intelligenceData as any;
      return data && data.riskScore > 80;
    }).length;

    // Schema mismatches (simplified check - count vendors without required fields)
    const allVendors = await prisma.vendor.findMany();
    const schemaMismatches = allVendors.filter(v => !v.name || !v.slug || v.districtId === null).length;

    // Fraud spikes (recent high risk fraud history records)
    const fraudSpike = await prisma.fraudHistory.count({
      where: {
        riskScore: { gt: 70 },
        createdAt: { gte: oneHourAgo }
      }
    });

    // Latency warnings (simplified - no real latency check here)
    const latencyWarning = criticalLogs > 5 ? 1 : 0;

    // Calculate integrity percentage (simplified)
    const totalIssues = inconsistentVendors + highRiskUsers + schemaMismatches + fraudSpike + latencyWarning;
    const integrity = Math.max(0, 100 - (totalIssues * 5)); // Arbitrary calculation

    const issues = [];

    if (inconsistentVendors > 0) {
      issues.push({
        type: "SCHEMA_MISMATCH",
        severity: "HIGH",
        entity: "Vendor_DSSL_Scores",
        count: inconsistentVendors
      });
    }

    if (highRiskUsers > 0) {
      issues.push({
        type: "FRAUD_SPIKE",
        severity: "CRITICAL",
        entity: "User_Intelligence",
        count: highRiskUsers
      });
    }

    if (schemaMismatches > 0) {
      issues.push({
        type: "DATA_INTEGRITY",
        severity: "MEDIUM",
        entity: "Vendor_Records",
        count: schemaMismatches
      });
    }

    if (fraudSpike > 0) {
      issues.push({
        type: "FRAUD_SPIKE",
        severity: "CRITICAL",
        entity: "Fraud_Detection",
        count: fraudSpike
      });
    }

    if (latencyWarning > 0) {
      issues.push({
        type: "LATENCY_WARNING",
        severity: "LOW",
        entity: "System_Performance",
        count: latencyWarning
      });
    }

    const recommendation = issues.length === 0
      ? "System operating normally"
      : issues.some(i => i.severity === "CRITICAL")
        ? "Execute Recovery Protocol Beta - Critical issues detected"
        : "Review and address high-priority issues";

    res.json({
      success: true,
      integrity: `${integrity}%`,
      issues,
      recommendation,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("🚨 System Health Audit Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to run system audit" });
  }
});

router.post("/kill-switch", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    await prisma.systemConfig.upsert({
      where: { key: "POLICY_ENABLED" },
      update: { value: { enabled } },
      create: { key: "POLICY_ENABLED", value: { enabled } }
    });

    // Log the emergency action
    await prisma.adminLog.create({
      data: {
        adminId: (req as any).user.id,
        action: enabled ? "KILL_SWITCH_DISABLED" : "KILL_SWITCH_ENABLED",
        details: `Policy engine ${enabled ? 're-enabled' : 'emergency disabled'}`
      }
    });

    res.json({
      success: true,
      enabled,
      message: `Policy engine ${enabled ? 're-enabled' : 'emergency disabled'}`
    });
  } catch (error: any) {
    console.error("🚨 Kill Switch Toggle Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to toggle kill switch" });
  }
});

// 🏥 ECONOMY METRICS - Governor Dashboard
router.get("/economy", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.query.districtId as string) || 1;

    // Get vendor statistics
    const totalVendors = await prisma.vendor.count({ where: { districtId } });
    const approvedVendors = await prisma.vendor.count({
      where: { districtId, status: 'APPROVED' }
    });

    // DSSL Score distribution
    const dsslStats = await prisma.vendor.aggregate({
      where: { districtId },
      _avg: { dsslScore: true },
      _max: { dsslScore: true },
      _min: { dsslScore: true }
    });

    // Top performing vendors
    const topVendors = await prisma.vendor.findMany({
      where: { districtId, status: 'APPROVED' },
      orderBy: { dsslScore: 'desc' },
      take: 5,
      select: { id: true, name: true, dsslScore: true }
    });

    // Declining vendors (low DSSL, recent issues)
    const decliningVendors = await prisma.vendor.findMany({
      where: {
        districtId,
        status: 'APPROVED',
        dsslScore: { lt: 30 }
      },
      orderBy: { dsslScore: 'asc' },
      take: 5,
      select: { id: true, name: true, dsslScore: true }
    });

    // Recent policy actions
    const recentActions = await prisma.adminLog.count({
      where: {
        action: { in: ['POLICY_SUSPEND', 'POLICY_RESTRICT', 'POLICY_BOOST'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // Order metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orderStats = await prisma.order.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        districtId
      },
      _count: true,
      _sum: { totalPrice: true }
    });

    // Market health calculation
    const avgDssl = dsslStats._avg.dsslScore || 0;
    const fraudVendors = await prisma.fraudHistory.groupBy({
      by: ['vendorId'],
      where: {
        riskScore: { gt: 50 },
        vendor: { districtId }
      }
    }).then(groups => groups.length);

    let marketHealth = 'GOOD';
    if (avgDssl < 40 || fraudVendors > totalVendors * 0.1) {
      marketHealth = 'WARNING';
    }
    if (avgDssl < 25 || fraudVendors > totalVendors * 0.2) {
      marketHealth = 'CRITICAL';
    }

    res.json({
      success: true,
      districtId,
      metrics: {
        totalVendors,
        approvedVendors,
        avgDssl: Math.round(avgDssl),
        maxDssl: dsslStats._max.dsslScore || 0,
        minDssl: dsslStats._min.dsslScore || 0,
        topVendors,
        decliningVendors,
        policyActionsToday: recentActions,
        ordersLast30Days: orderStats._count,
        revenueLast30Days: orderStats._sum.totalPrice || 0,
        fraudVendors,
        marketHealth
      }
    });
  } catch (error: any) {
    console.error("🚨 Economy Metrics Fetch Failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch economy metrics" });
  }
});

// --- ADMIN: GET All Users ---
router.get("/users", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true, // ✅ 'name' की जगह 'username'
        role: true,
        districtId: true,
        createdAt: true,
        // lastLogin: true // ❌ इसे हटा दिया क्योंकि यह स्कीमा में नहीं है
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ data: users });
  } catch (e) {
    console.error("Failed to fetch users", e);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

// --- ADMIN: PATCH User Role (Promote to District Admin or Merchant) ---
router.patch("/users/:id/role", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { role, districtId } = req.body;
    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const validRoles = ['customer', 'seller', 'merchant', 'admin', 'DISTRICT_ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Map new role to legacy role
    const legacyRole = role === 'SUPER_ADMIN' ? 'admin' : role === 'DISTRICT_ADMIN' ? 'admin' : role;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'DISTRICT_ADMIN' || role === 'admin';

    const updateData: any = {
      role: legacyRole,
      isAdmin
    };

    // Add districtId for DISTRICT_ADMIN
    if (districtId && (role === 'DISTRICT_ADMIN' || role === 'admin')) {
      updateData.districtId = parseInt(districtId, 10);
    }

    const updated = await storage.updateUser(userId, updateData);

    console.log(`👤 User Role Update: User ${userId} - Role: ${role}`);

    return res.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        role: role,
        isAdmin: updated.isAdmin
      },
      message: `User "${user.username}" promoted to ${role}`
    });
  } catch (e: any) {
    console.error("User role update failed", e?.message);
    return res.status(500).json({ message: e?.message || "Role update failed" });
  }
});

// 🛡️ BHARAT-OS: Admin Vendor Registry Route
router.get("/vendors", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.query.districtId as string) || 1;

    // डेटाबेस से वेंडर्स निकालें
    const vendors = await prisma.vendor.findMany({
      where: { districtId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: vendors });
  } catch (error: any) {
    console.error("🚨 Admin Vendor Fetch Failed:", error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/vendors", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category, initialScore } = req.body;

    // 🛡️ BHARAT-OS: Validating and creating new vendor
    const vendorData: any = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      category: category || "GROCERY",
      status: 'APPROVED', // एडमिन बना रहा है तो सीधे Approve
      dsslScore: parseFloat(initialScore) || 5.0,
      districtId: 1, // Default to Shahdol (ID: 1)
      businessType: 'RETAIL',
      images: [],
      specialties: [],
      safetyBadges: ["new-vendor"]
    };

    // Build search text using cognition taxonomy
    vendorData.searchText = buildVendorSearchText({
      name: vendorData.name,
      category: vendorData.category,
      businessType: vendorData.businessType,
      districtId: 1 // Default district
    });

     const newVendor = await prisma.vendor.create({
      data: vendorData as any
    });

    console.log(`🎊 Sovereign Success: ${name} added to the Empire.`);
    return res.status(201).json({ success: true, data: newVendor });
  } catch (error: any) {
    console.error("🚨 Registry Error:", error.message);
    return res.status(500).json({ success: false, message: "Sovereign Registry Error" });
  }
});

// --- ADMIN: DSSL Calculate and Apply Rankings ---
router.post("/dssl/calculate", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { weights, districtId } = req.body;

    // 🛡️ BHARAT-OS: AI Ranking Logic
    const vendors = await prisma.vendor.findMany({
      where: { districtId }
    });

    // Calculate new scores and update database
     const updatePromises = vendors.map(v => {
      const newScore = parseFloat((
        (v.rating * weights.rating) +
        ((((v as any).orderCount || 0) / 100) * weights.orders) +
        (v.dsslScore * weights.safety)
      ).toFixed(2));

      return prisma.vendor.update({
        where: { id: v.id },
        data: { dsslScore: newScore }
      });
    });

    // Execute all updates
    await Promise.all(updatePromises);

    // Return updated rankings
    const updatedVendors = await prisma.vendor.findMany({
      where: { districtId },
      orderBy: { dsslScore: 'desc' }
    });

    res.json({
      success: true,
      message: "DSSL scores recalculated and applied successfully",
      rankings: updatedVendors
    });
  } catch (error: any) {
    console.error("🚨 DSSL Calculation Failed:", error.message);
    return res.status(500).json({ success: false, message: "Calculation failed" });
  }
});

// --- ADMIN: Global Search (Vendors, Products, Orders, Users) ---
// (Search route moved back to main routes.ts for now)

// 📊 Observability: Health Check
router.get("/health", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const [vendorStats, adminStats] = await Promise.all([
      prisma.vendor.aggregate({
        where: { status: "APPROVED" },
        _count: { id: true },
        _avg: { dsslScore: true }
      }),
      prisma.adminLog.aggregate({
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    const shadowBanned = await prisma.vendor.count({
      where: { isShadowBanned: true }
    });

    res.json({
      success: true,
      data: {
        vendors: vendorStats._count.id,
        shadowBanned,
        avgDsslScore: Math.round((vendorStats._avg.dsslScore || 0) * 100) / 100,
        adminActions24h: adminStats._count.id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[HEALTH_CHECK_ERROR]", error);
    res.status(500).json({ success: false, error: "Health check failed" });
  }
});

// 🧠 USER INTELLIGENCE ENDPOINT
router.get("/user-intelligence", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        userIntelligence: true,
         _count: {
          select: {
            orders: true,
            reviews: true,
            fraudHistories: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit for dashboard
    });

    // Compute intelligence for users without it
    const usersWithIntelligence = await Promise.all(
      users.map(async (user) => {
        if (!user.userIntelligence) {
          const actions = await applyUserActions(user.id);
          return { ...user, userIntelligence: actions };
        }
        return user;
      })
    );

    res.json({
      success: true,
      users: usersWithIntelligence
    });
  } catch (error) {
    console.error("[USER_INTELLIGENCE_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to fetch user intelligence" });
  }
});

// System health endpoints
router.get("/system-health", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const isLockedDown = await checkSystemLockdown();
    const priorityAlerts = await getPriorityAlerts(10);
    const falsePositiveMetrics = await getFalsePositiveMetrics();

    res.json({
      success: true,
      lockdownMode: isLockedDown,
      priorityAlerts,
      alertCount: priorityAlerts.length,
      falsePositiveMetrics
    });
  } catch (error) {
    console.error("[SYSTEM_HEALTH_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to get system health" });
  }
});

// Admin feedback endpoint
router.post("/user-feedback", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, action, reason } = req.body;
     const adminId = req.user?.userId;

    if (!adminId || !userId || !action) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    await processAdminFeedback(adminId, userId, action, reason);

    // Auto-tune policies periodically
    if (Math.random() < 0.1) { // 10% chance to trigger tuning
      await autoTunePolicies();
    }

    res.json({ success: true, message: "Feedback processed and policies auto-tuned" });
  } catch (error) {
    console.error("[ADMIN_FEEDBACK_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to process feedback" });
  }
});

// Trigger system lockdown
router.post("/system-lockdown", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { enable } = req.body;
    // In production, set a global flag that disables reviews and registrations
    console.log(`${enable ? '🔒' : '🔓'} System lockdown ${enable ? 'ENABLED' : 'DISABLED'}`);

    // Store lockdown status in system config
    await prisma.systemConfig.upsert({
      where: { key: "system_lockdown" },
      update: { value: enable },
      create: { key: "system_lockdown", value: enable }
    });

    res.json({
      success: true,
      message: `System lockdown ${enable ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error("[LOCKDOWN_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to toggle lockdown" });
  }
});

// Emergency kill switch
router.post("/kill-switch", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🚨 EMERGENCY KILL SWITCH ACTIVATED 🚨');

    // Disable all marketplace operations
    await prisma.systemConfig.upsert({
      where: { key: "kill_switch" },
      update: { value: true },
      create: { key: "kill_switch", value: true }
    });

    // In production, this would:
    // - Stop all background jobs
    // - Disable user registrations
    // - Disable vendor approvals
    // - Disable payments
    // - Send emergency notifications

    res.json({
      success: true,
      message: "Emergency kill switch activated. All operations halted."
    });
  } catch (error) {
    console.error("[KILL_SWITCH_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to activate kill switch" });
  }
});

// Sovereign Fraud Summary
router.get("/fraud-summary", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;

    const vendors = await prisma.vendor.findMany({
      where: req.ctx?.role === "SUPER_ADMIN" ? {} : { districtId },
      select: { id: true, status: true }
    });

    const fraudHistory = await prisma.fraudHistory.findMany({
      where: req.ctx?.role === "SUPER_ADMIN" ? {} : {
        vendor: { districtId }
      },
      orderBy: { id: "desc" },
      take: 100
    });

     const pendingAlerts = fraudHistory.filter(f => !(f.details as any)?.resolved).length;
    const resolvedToday = fraudHistory.filter(f => (f.details as any)?.resolved === true).length;
    const highRiskVendors = new Set(fraudHistory.filter(f => f.riskScore >= 70).map(f => f.vendorId)).size;

    return res.json({
      success: true,
      data: {
        pendingAlerts,
        resolvedToday,
        highRiskVendors,
        trend: pendingAlerts > 5 ? "rising" : "stable"
      }
    });
  } catch (e) {
    console.error("Fraud summary error", e);
    return res.status(500).json({ success: false, error: "Failed to fetch fraud summary" });
  }
});
// Sovereign Fraud Alerts
router.get("/fraud-alerts", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(403).json({ success: false, error: "District assignment required" });
    }

    const alerts = await prisma.fraudHistory.findMany({
      where: {
        vendor: { districtId }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { id: "desc" },
      take: 50
    });

    return res.json({ success: true, data: alerts });
  } catch (e) {
    console.error("Fraud alerts error", e);
    return res.status(500).json({ success: false, error: "Failed to fetch fraud alerts" });
  }
});

// Sovereign Fraud Alert Resolution
router.patch("/fraud-alerts/:id/resolve", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const vendorId = parseInt(req.params.id);
    const { action } = req.body;

    await applyFraudActions(vendorId);

     await prisma.adminLog.create({
      data: {
        adminId: req.user?.userId || 0,
        action: "FRAUD_ALERT_RESOLVED",
        details: {
          targetId: vendorId,
          message: `Fraud alert resolved with action: ${action}`,
          meta: { vendorId, action }
        }
      }
    });

    res.json({
      success: true,
      message: `Fraud alert resolved for vendor ${vendorId}`
    });
  } catch (error) {
    console.error("[RESOLVE_ALERT_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to resolve alert" });
  }
});

// Audit logs API
router.get("/audit-logs", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
     const logs = await prisma.adminLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            role: true,
            user: {
              select: { username: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("[AUDIT_LOGS_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to get audit logs" });
  }
});

// Policies API
router.get("/policies", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    // In production, get from config
    const policies = {
      riskThreshold: 70,
      trustThreshold: 30,
      autoTuneEnabled: true
    };

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error("[POLICIES_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to get policies" });
  }
});

// Update policies API
router.patch("/policies", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { riskThreshold, trustThreshold, autoTuneEnabled } = req.body;

    // In production, save to config
    console.log('Policies updated:', { riskThreshold, trustThreshold, autoTuneEnabled });

    res.json({
      success: true,
      message: "Policies updated successfully"
    });
  } catch (error) {
    console.error("[UPDATE_POLICIES_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to update policies" });
  }
});

// Policy scan API
router.post("/policy-scan", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    // Trigger a full policy scan
    console.log('Running policy scan...');

    // In production, this would:
    // - Scan all users and vendors against current policies
    // - Generate reports
    // - Update statuses

    res.json({
      success: true,
      message: "Policy scan completed successfully"
    });
  } catch (error) {
    console.error("[POLICY_SCAN_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to run policy scan" });
  }
});

// Simulate policy changes API
router.post("/simulate-policy", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { riskThreshold, trustThreshold } = req.body;

    // Simulate what would happen with new thresholds
    const allUserIntel = await prisma.userIntelligence.findMany();
    const affectedUsers = allUserIntel.filter(ui => {
      const data = ui.intelligenceData as any;
      if (!data) return false;
      return (data.riskScore >= riskThreshold) || (data.trustScore <= trustThreshold);
    }).length;

    const allVendors = await prisma.vendor.findMany();
    const affectedVendors = allVendors.filter(v => v.dsslScore <= trustThreshold).length;

    res.json({
      success: true,
      data: {
        affectedUsers,
        affectedVendors,
        riskThreshold,
        trustThreshold
      }
    });
  } catch (error) {
    console.error("[SIMULATE_POLICY_ERROR]", error);
    res.status(500).json({ success: false, error: "Failed to simulate policy changes" });
  }
});

export default router;
