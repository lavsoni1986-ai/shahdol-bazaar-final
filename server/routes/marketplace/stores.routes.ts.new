import express, { type Request, type Response } from "express";
import { trackVendorView, trackUserEvent } from "../../services/user.tracking";
import { eventQueue } from "../../services/event.queue";
import { updateUserPreference } from "../../services/personalization.engine";
import { validateQuery } from "../../middleware/validate";
import { storesQueryDTO } from "../../dto/marketplace.dto";
import { success, failure } from "../../lib/apiResponse";
import { explainVendorRecommendation } from "../../lib/aiExplainability";
import { findStoresByDistrict, findVendorBySlug, findVendorById } from "../../repositories/vendor.repo";
import { findProductsByVendor } from "../../repositories/product.repo";
import { findDistrictBySlug } from "../../repositories/district.repo";
import { findRecentUserEvent } from "../../repositories/userEvent.repo";
import { prisma } from "../../storage";
import {
  getUnifiedDiscoveryFeed,
  getTopDiscoveryPicks,
  getDiscoveryByType
} from "../../services/discovery.service";

const router = express.Router();

// 🧠 AI EXPLANATION ENGINE
function explainVendorRanking(vendor: any) {
  const reasons = [];

  // DSSL Score factors
  if (vendor.dsslScore >= 80) {
    reasons.push("Excellent DSSL score - highly trusted by the platform");
  } else if (vendor.dsslScore >= 60) {
    reasons.push("Good DSSL score - reliable vendor");
  } else if (vendor.dsslScore >= 40) {
    reasons.push("Average DSSL score - building trust");
  }

  // Rating factors
  if (vendor.avgRating >= 4.5) {
    reasons.push("Outstanding customer ratings");
  } else if (vendor.avgRating >= 4.0) {
    reasons.push("High customer satisfaction");
  }

  // Response time (if available)
  if (vendor.vendorMLProfile?.responseTimeMs < 300000) { // < 5 minutes
    reasons.push("Fast response to customer inquiries");
  }

  // Success rate
  if (vendor.vendorMLProfile?.successRate > 0.95) {
    reasons.push("Excellent delivery success rate");
  } else if (vendor.vendorMLProfile?.successRate > 0.9) {
    reasons.push("Reliable delivery performance");
  }

  // Growth indicators
  if (vendor.vendorMLProfile?.growthRate > 0.2) {
    reasons.push("Rapidly growing and improving vendor");
  }

  return {
    dsslScore: vendor.dsslScore,
    avgRating: vendor.avgRating,
    reasons: reasons.slice(0, 3), // Top 3 reasons
    score: reasons.length // Explanation confidence score
  };
}

// 🏠 HOME SNAPSHOT ADAPTER: Convert discovery feed to backward-compatible format
function adaptDiscoveryHomePayload(feed: any[]) {
  return {
    stores: feed
      .filter((x) => x.entityType === "SHOP")
      .map((x) => ({
        id: x.sourceId,
        name: x.title,
        slug: x.slug,
        logo: x.image,
        image: x.image,
        category: x.subtitle,
        address: x.address,
        phone: x.phone,
        isSponsored: x.isSponsored,
        dsslScore: x.dsslScore,
        reason: "Top verified match in your district"
      })),

    products: feed
      .filter((x) => x.entityType === "PRODUCT")
      .map((x) => ({
        id: x.sourceId,
        title: x.title,
        slug: x.slug,
        imageUrl: x.image,
        price: x.meta?.price,
        mrp: x.meta?.mrp,
        category: x.subtitle,
        isTrending: (x.rankScore || 0) > 85
      })),

    schools: feed.filter((x) => x.entityType === "SCHOOL"),

    hospitals: feed.filter((x) => x.entityType === "HOSPITAL"),

    buses: feed.filter((x) => x.entityType === "BUS"),

    workers: feed.filter((x) => x.entityType === "SERVICE"),
  };
}

// ============================================
// 🏪 MERCHANT LISTINGS
// ============================================

// --- FETCH STORES BY DISTRICT ---
router.get("/stores", validateQuery(storesQueryDTO), async (req: Request, res: Response) => {
  try {
    const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");

    setNoStore(res);

    // ✅ DTO VALIDATION: Query params are validated and transformed
    const { limit = 20 } = req.query;

    const effectiveDistrictId = req.ctx?.districtId;

    if (!effectiveDistrictId) {
      return res.status(400).json({
        success: false,
        error: "District context required"
      });
    }

    // 🔥 AI RANKING: Order by discovery engine rank score
    const stores = await getDiscoveryByType(effectiveDistrictId, "SHOP");
    const limitedStores = stores.slice(0, Number(limit) || 20);

    // 🔥 USER BEHAVIOR TRACKING: Track marketplace view for authenticated users
    if (req.ctx?.userId) {
      await trackVendorView(req.ctx.userId, null, req); // Track general marketplace visit
    }

    // Deterministic ranking: sovereign engine rank score
    const rankedStores = limitedStores.map((store: any, index: number) => {
      const normalizedStore = {
        id: store.sourceId,
        name: store.title,
        slug: store.slug,
        logo: store.image,
        image: store.image,
        category: store.subtitle,
        address: store.address,
        phone: store.phone,
        isSponsored: store.isSponsored,
        dsslScore: store.dsslScore,
        rankScore: store.rankScore
      };

      return {
        ...normalizedStore,
        finalScore: Number((store.rankScore || 0) / 100).toFixed(2),
        _explanation: explainVendorRecommendation(
          normalizedStore,
          index + 1,
          limitedStores.length,
          req.user ? { preferredCategories: [], location: req.ctx?.districtId } : {}
        ),
        _meta: {
          aiRanked: true,
          sovereignRanked: true,
          position: index + 1,
          total: limitedStores.length
        }
      };
    });

    return res.json(success(rankedStores, {
      total: rankedStores.length,
      aiRanked: true,
      districtId: effectiveDistrictId,
      source: "PSR_DISCOVERY_ENGINE",
      requestId: `stores_${Date.now()}`
    }));
  } catch (e) {
    console.error("Marketplace stores fetch error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch stores", details: e instanceof Error ? e.message : 'Unknown error' });
  }
});

// --- FETCH STORE BY SLUG ---
router.get("/stores/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(400).json({ message: "District context required" });
    }

    console.log(`[MARKETPLACE] Fetching store details for slug: ${slug} in district: ${districtId}`);

    const store = await findVendorBySlug(slug, districtId);

    if (!store) {
      console.log(`[MARKETPLACE] Store NOT FOUND in Vendor table: ${slug}`);
      return res.status(404).json({ message: "Store not found" });
    }

    return res.json(store);
  } catch (e) {
    console.error(`[MARKETPLACE] Error fetching store ${req.params.slug}:`, e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// --- GET VENDOR BY ID (Fixes 404 on Cart) ---
router.get("/vendors/id/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const vendor = await findVendorById(id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // 🔥 USER BEHAVIOR TRACKING: Track vendor detail view
    if (req.ctx?.userId) {
      await trackVendorView(req.ctx.userId, id, req);
    }

    return res.json(vendor);
  } catch (e) {
    console.error("Vendor fetch error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// --- GET SHOP BY ID (Fallback Fix) - WITH TENANT SAFETY ---
router.get("/shops/:id", async (req: Request, res: Response) => {
  try {
    const shopId = parseInt(req.params.id);
    const districtId = req.ctx?.districtId;

    // 🔴 Guard: District context required
    if (!districtId) {
      return res.status(400).json({
        error: "❌ District context missing - Sovereign gate blocked"
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId, districtId }
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.json(shop);
  } catch (e) {
    console.error("Shop fetch error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;