import type { Request, Response } from "express";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../storage";
import { requireAuth, requireSuperAdmin, requireCSRF } from "../auth/middleware";
import { findActiveOffersByDistrict, deleteOfferById } from "../repositories/offer.repo";
import { findAllCategories, deleteCategoryById } from "../repositories/category.repo";
import { adminRateLimiter } from "../auth/rateLimiter";
import { DSSL, DSSLService } from "../services/dssl.service";
import aiRoutes from "./ai/concierge.routes";
import dsslRoutes from "./ai/dssl.engine";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin/index";

import adminDsslRoutes from "./admin/dssl";
import paymentsCashfreeRoutes from "./payments.cashfree.routes";
import vendorDashboardRoutes from "./marketplace/vendor-dashboard.routes";
import billingRoutes from "./billing.routes";
import homeRoutes from "./public/home.routes";
import statsRoutes from "./public/stats.routes";
import localRoutes from "./public/local.routes";
import productsRoutes from "./marketplace/products.routes";
import storesRoutes from "./marketplace/stores.routes";
import reviewsRoutes from "./marketplace/reviews.routes";
import ordersRoutes from "./orders.routes";
import merchantRoutes from "./marketplace/products.routes";
import uploadRoutes from "./upload.routes";
import searchUnifiedRoutes from "./search.unified.routes";
import analyticsRoutes from "./analytics.routes";
import transitRoutes from "./transit.routes";
import appointmentsRoutes from "./appointments.routes";
import customerRoutes from "./customer.routes";


// 🧾 AUDIT LOGGING HELPER (TAMPER-PROOF)
type AuthenticatedRequest = Request & {
  ctx?: {
    userId: number | null;
    districtId: number | null;
    role: string | null;
    tokenVersion: number | null;
    username: string | null;
  };
  districtId?: number;
};

const auditLog = async (
  action: string,
  req: AuthenticatedRequest,
  targetId?: number,
  targetType?: string,
  details?: string,
  metadata?: unknown
) => {
  try {
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true }
    });

    const auditData = JSON.stringify({
      action,
      userId: req.ctx?.userId ?? null,
      targetId,
      targetType,
      details,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      districtId: req.ctx?.districtId ?? req.districtId ?? null,
      timestamp: new Date().toISOString()
    });

    const crypto = await import('crypto');
    const currentHash = crypto.default.createHash('sha256')
      .update((lastEntry?.hash || 'GENESIS') + auditData)
      .digest('hex');

    await prisma.auditLog.create({
      data: {
        action,
        ...(req.ctx?.userId !== undefined ? { userId: req.ctx.userId } : {}),
        // Ensure canonical entity mapping for audit schema
        entityType: (targetType || action || 'SYSTEM').toString(),
        entityId: (typeof targetId === 'number' && targetId > 0) ? targetId : (req.districtId as number),
        targetId,
        targetType,
        details,
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        districtId: (() => {
          if (!req.districtId) {
            throw new Error("Missing district in audit");
          }
          return req.districtId;
        })(),
        hash: currentHash,
        prevHash: lastEntry?.hash || null,
      }
    });
  } catch (err) {
    console.error("Audit logging failed:", err);
  }
};

// 🛡️ AUDIT INTEGRITY VERIFICATION
const verifyAuditIntegrity = async () => {
  try {
    const audits = await prisma.auditLog.findMany({
      orderBy: { id: 'asc' }
    });

    let currentChainHash = 'GENESIS';
    const violations = [];

    const crypto = await import('crypto');
    for (const audit of audits) {
      const expectedData = JSON.stringify({
        action: audit.action,
        userId: audit.userId,
        targetId: audit.targetId,
        // Sovereign Note: Ensure all hashed fields match the logger
      });

      const expectedHash = crypto.default.createHash('sha256')
        .update(currentChainHash + expectedData)
        .digest('hex');

      // 🛡️ SOVEREIGN ENFORCEMENT: Strict hash chain validation
      if (audit.hash !== expectedHash) {
        violations.push({
          id: audit.id,
          expected: expectedHash,
          actual: audit.hash
        });
      }
      currentChainHash = expectedHash; // Always use expected hash for next chain 
    }

    if (violations.length > 0) {
      console.error("🚨 AUDIT INTEGRITY VIOLATION:", violations);
      throw new Error(`Hash chain compromised: ${violations.length} violations found`);
    }

    console.log("✅ Audit integrity verified - Sovereign Chain Intact");
    return true;
  } catch (err) {
    console.error("Audit integrity check failed:", err);
    return false;
  }
};

const router = Router();

// Standardized Responses
const success = <T,>(res: Response, data: T) => res.json({ success: true, data });
const failure = (res: Response, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });

// 🎯 BUSINESS MODEL: Commission Rate
const COMMISSION_RATE = 0.05; // 5%

// ============================================
// 🧩 ROUTE FAMILY EXTRACTION (keep index thin)
// ============================================
router.use("/", vendorDashboardRoutes);
router.use("/", billingRoutes);
router.use("/", homeRoutes);

// ============================================
// 🔐 AUTH & DISTRICT ROUTES
// ============================================

// Note: /auth/verify is now handled by authRoutes in auth.routes.ts
// to ensure consistent auth state and proper token version validation

router.get("/districts", async (req, res) => {
  const districts = await prisma.district.findMany({ where: { isActive: true } });
  return success(res, districts);
});

// 🛡️ SOVEREIGN API: Get district by slug
router.get("/districts/:slug", async (req, res) => {
  const { slug } = req.params;
  const district = await prisma.district.findUnique({ where: { slug } });
  if (!district) {
    return failure(res, "NOT_FOUND", "District not found", 404);
  }
  return success(res, district);
});

// 🛡️ SOVEREIGN API: Offers endpoint
router.get("/offers", async (req, res) => {
  try {
    if (!req.districtId) {
      return failure(res, "DISTRICT_REQUIRED", "District context required", 400);
    }

    const effectiveDistrictId = Number(req.districtId);
    const offers = await findActiveOffersByDistrict(effectiveDistrictId);
    return success(res, offers);
  } catch (err) {
    console.error("Offers fetch error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch offers", 500);
  }
});

router.delete("/offers/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const offerId = parseInt(req.params.id);
    await deleteOfferById(offerId);
    return success(res, { message: "Offer deleted" });
  } catch (err) {
    console.error("Offer delete error:", err);
    return failure(res, "SERVER_ERROR", "Failed to delete offer", 500);
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await findAllCategories();
    return success(res, categories);
  } catch (err) {
    console.error("Categories fetch error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch categories", 500);
  }
});

// --- DELETE CATEGORY ---
router.delete("/categories/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    await deleteCategoryById(categoryId);
    return success(res, { message: "Category deleted" });
  } catch (err) {
    console.error("Category delete error:", err);
    return failure(res, "SERVER_ERROR", "Failed to delete category", 500);
  }
});

// 🛡️ SOVEREIGN API: Marketplace vendors by slug (canonical resolver)
router.get("/marketplace/vendors/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const districtId = req.ctx?.districtId;
    const requestId = `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!districtId) {
      return failure(res, "DISTRICT_REQUIRED", "District context required", 400);
    }

    const { resolveVendorBySlug } = await import("../services/entity-resolution");
    const result = await resolveVendorBySlug(slug, districtId, requestId);

    if (!result.success) {
      const fail = result.failure!;
      console.warn(`[MARKETPLACE_VENDORS] Resolution failed: ${fail.reason}`, {
        slug, districtId, requestId,
        diagnostics: fail.diagnostics
      });
      return failure(res, "NOT_FOUND", "Vendor not found", 404);
    }

    return success(res, result.data);
  } catch (err) {
    console.error("Marketplace vendor error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor", 500);
  }
});

// 🛡️ SOVEREIGN API: Marketplace orders by vendor slug
router.get("/marketplace/orders/:slug", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const districtId = req.ctx?.districtId || req.districtId;
    if (!districtId) {
      return failure(res, "DISTRICT_REQUIRED", "District context required", 400);
    }
    const vendor = await prisma.vendor.findFirst({
      where: {
        slug,
        districtId,
        status: "APPROVED",
        isShadowBanned: false
      }
    });
    if (!vendor) {
      return failure(res, "NOT_FOUND", "Vendor not found", 404);
    }
    const orders = await prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: {
        user: { select: { id: true, username: true } },
        product: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return success(res, orders);
  } catch (err) {
    console.error("Marketplace orders error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch orders", 500);
  }
});

// ============================================
// 🏪 MARKETPLACE ROUTES (District Isolated)
// NOTE: /marketplace/stores and /marketplace/products are now handled
// by specialized route files mounted in index.ts:
// - stores.routes.ts -> /api/marketplace/stores
// - products.routes.ts -> /api/marketplace/products
// ============================================

// NOTE: /marketplace/products is now handled by products.routes.ts
// mounted at /api/marketplace/products in index.ts

// ============================================
// 👑 ADMIN & DSSL ROUTES
// ============================================


router.get("/health", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  return res.json({ status: "ok", uptime: process.uptime() });
});

type RouteHost = ReturnType<typeof Router>;

export const registerSovereignRoutes = async (app: RouteHost) => {
  // Routes are mounted at /api prefix (set in index.ts)
  // So they become: /api/auth/verify, /api/districts, etc.
  app.use("", router);          // Main router: /districts, /offers, etc.
  app.use("/auth", authRoutes); // Auth: /login, /verify, /register, /balance, /transactions
  app.use("/user", (req, res) => {
    const oldPath = req.originalUrl;
    const newPath = oldPath.replace("/api/user", "/api/auth");
    console.warn(`[DEPRECATED_ROUTE]\n${oldPath}\n${newPath}`);
    return res.redirect(301, newPath);
  });

  // ============================================
  // 🗑️  ADR-002 PHASE 2B: PRODUCT ALIAS RETIREMENT
  // Legacy /api/products/* → Canonical /api/marketplace/products/*
  // HTTP 301 Moved Permanently — query params and dynamic segments preserved
  // ============================================
  app.use("/products", (req, res) => {
    const oldPath = req.originalUrl;
    const newPath = oldPath.replace("/api/products", "/api/marketplace/products");
    console.warn(`[DEPRECATED_ROUTE]\n${oldPath}\n${newPath}`);
    return res.redirect(301, newPath);
  });
  app.use("/ai", aiRoutes);   // AI: /chat, /search, etc.
  app.use("/ai", dsslRoutes); // DSSL: /score, /analysis, etc.
  app.use("/admin", adminRoutes); // Admin: /users, /vendors, etc.
  // PATCH 9A: Retire noisy/duplicate admin demo surfaces (keep files, disable mounts)

  app.use("/admin/dssl", adminDsslRoutes); // DSSL: /dssl/weights, /dssl/recalculate
  app.use("/payments", paymentsCashfreeRoutes); // Payments: /create, /verify
  app.use("", statsRoutes); // Stats: categories, hospitals, etc.
  app.use("/local", localRoutes); // Local: schools, bus, etc.
  app.use("", merchantRoutes); // Merchant: products
  app.use("/upload", uploadRoutes); // Upload: Cloudinary images
  app.use("/marketplace", storesRoutes); // Marketplace: stores
  app.use("/marketplace", productsRoutes); // Marketplace: products
  app.use("/marketplace/reviews", reviewsRoutes); // Marketplace: reviews
  app.use("/analytics", analyticsRoutes); // Analytics: tracking
  app.use("/search", searchUnifiedRoutes); // Unified search
  app.use("/orders", requireCSRF, ordersRoutes); // Orders: with CSRF

  app.use("/appointments", appointmentsRoutes); // Appointments: POST /create
  app.use("/customer", customerRoutes); // Customer profile & addresses

  app.use("", transitRoutes); // Transit: /bus-timetable, etc.

  // 🛡️ SOVEREIGN API: Banners
  router.get("/banners", async (req, res) => {
    try {
      const banners = await prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { id: "desc" }
      });
      return success(res, banners);
    } catch (err) {
      console.error("Banners fetch error:", err);
      return failure(res, "SERVER_ERROR", "Failed to fetch banners", 500);
    }
  });

  console.log("✅ Routes registered: /api/auth, /api/ai, /api/admin, /districts, /stats, /local, /merchant, /upload, /marketplace, /analytics, /orders, /banners");
};
