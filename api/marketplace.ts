import { createBaseApp, errorHandler } from "./bootstrap";
import { Router } from "express";
import { prisma } from "../server/storage";
import { requireAuth, requireSuperAdmin, requireCSRF } from "../server/auth/middleware";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { findActiveOffersByDistrict, deleteOfferById } from "../server/repositories/offer.repo";
import { findAllCategories, deleteCategoryById } from "../server/repositories/category.repo";

import vendorDashboardRoutes from "../server/routes/marketplace/vendor-dashboard.routes";
import billingRoutes from "../server/routes/billing.routes";
import homeRoutes from "../server/routes/public/home.routes";
import statsRoutes from "../server/routes/public/stats.routes";
import localRoutes from "../server/routes/public/local.routes";
import productsRoutes from "../server/routes/marketplace/products.routes";
import storesRoutes from "../server/routes/marketplace/stores.routes";
import reviewsRoutes from "../server/routes/marketplace/reviews.routes";
import ordersRoutes from "../server/routes/orders.routes";
import paymentsCashfreeRoutes from "../server/routes/payments.cashfree.routes";
import searchUnifiedRoutes from "../server/routes/search.unified.routes";
import analyticsRoutes from "../server/routes/analytics.routes";
import transitRoutes from "../server/routes/transit.routes";
import appointmentsRoutes from "../server/routes/appointments.routes";

const app = createBaseApp();
const router = Router();

// Standardized JSON response utilities
const success = <T,>(res: any, data: T) => res.json({ success: true, data });
const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });

// ============================================
// INLINE MARKETPLACE DISCOVERY ROUTES
// ============================================

router.get("/districts", async (req, res) => {
  try {
    const districts = await prisma.district.findMany({ where: { isActive: true } });
    return success(res, districts);
  } catch (err) {
    return failure(res, "SERVER_ERROR", "Failed to fetch districts", 500);
  }
});

router.get("/districts/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const district = await prisma.district.findUnique({ where: { slug } });
    if (!district) {
      return failure(res, "NOT_FOUND", "District not found", 404);
    }
    return success(res, district);
  } catch (err) {
    return failure(res, "SERVER_ERROR", "Failed to fetch district", 500);
  }
});

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

router.get("/marketplace/vendors/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const districtId = req.ctx?.districtId;
    const requestId = `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!districtId) {
      return failure(res, "DISTRICT_REQUIRED", "District context required", 400);
    }

    const { resolveVendorBySlug } = await import("../server/services/entity-resolution");
    const result = await resolveVendorBySlug(slug, districtId, requestId);

    if (!result.success) {
      return failure(res, "NOT_FOUND", "Vendor not found", 404);
    }

    return success(res, result.data);
  } catch (err) {
    console.error("Marketplace vendor error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor", 500);
  }
});

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

// Mount the inline router
app.use("/api", router);

// Mount main routing modules
app.use("/api", vendorDashboardRoutes);
app.use("/api", billingRoutes);
app.use("/api", homeRoutes);
app.use("/api", statsRoutes);
app.use("/api/local", localRoutes);
app.use("/api/marketplace", tenantResolver, storesRoutes);
app.use("/api/marketplace", tenantResolver, productsRoutes);
app.use("/api/marketplace/reviews", tenantResolver, reviewsRoutes);
app.use("/api/analytics", tenantResolver, analyticsRoutes);
app.use("/api/search", tenantResolver, searchUnifiedRoutes);
app.use("/api/orders", requireCSRF, ordersRoutes);
app.use("/api/payments", paymentsCashfreeRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api", transitRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
