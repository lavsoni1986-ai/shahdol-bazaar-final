import { Router } from "express";
import { prisma } from "../../storage";
import { getTrustScore } from "../../services/dssl.service";

const router = Router();

// --- ROUTE ORDER: Static → Semi-dynamic → Fully dynamic ---

// GET /api/marketplace/vendors/trust-scores (static)
router.get("/trust-scores", async (req, res) => {
  try {
    const districtId = req.districtId;
    const idsParam = req.query.ids as string;

    if (!districtId || !idsParam) {
      return res.status(400).json({
        success: false,
        error: "Invalid request"
      });
    }

    const ids = idsParam.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid IDs provided"
      });
    }

    // 🛡️ HARDEN: Only expose publicly available vendors
    const publicVendors = await prisma.vendor.findMany({
      where: {
        id: { in: ids },
        districtId,
        status: "APPROVED" as any,
        isShadowBanned: false
      },
      select: { id: true }
    });

    const publicIds = publicVendors.map(v => v.id);

    const results = await Promise.all(
      publicIds.map(id => getTrustScore(id, districtId).catch(() => null))
    );

    const scores: Record<number, any> = {};
    publicIds.forEach((id, index) => {
      scores[id] = results[index];
    });

    return res.json({
      success: true,
      data: scores
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch trust scores"
    });
  }
});

// GET /api/marketplace/vendors/:id/trust-score (semi-dynamic)
router.get("/:id/trust-score", async (req, res) => {
  try {
    const districtId = req.districtId;
    const id = Number(req.params.id);

    if (!districtId || !id) {
      return res.status(400).json({
        success: false,
        error: "Invalid request"
      });
    }

    // 🛡️ HARDEN: Public vendor existence guard
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        districtId,
        status: "APPROVED" as any,
        isShadowBanned: false
      }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not publicly available"
      });
    }

    const result = await getTrustScore(id, districtId);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Failed to compute trust score"
    });
  }
});

// GET /api/marketplace/vendors/:slug (fully dynamic - moved to bottom)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const districtId = req.districtId;

    if (!districtId) {
      return res.status(400).json({
        success: false,
        error: "Missing district context"
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: {
        districtId_slug: {
          districtId,
          slug,
        },
      },
      include: {
        products: {
          where: {
            approved: true,
            status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
          },
          orderBy: {
            createdAt: "desc"
          },
          include: {
            images: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found"
      });
    }

    // 🛡️ Sovereign public visibility guard
    if (vendor.status !== "APPROVED" || vendor.isShadowBanned) {
      return res.status(404).json({
        success: false,
        error: "Vendor not publicly available"
      });
    }

    return res.json({
      success: true,
      data: vendor,
      meta: {
        source: "PSR_VENDOR_DETAIL_ENGINE",
        productCount: vendor.products?.length || 0
      }
    });

  } catch (err) {
    console.error("❌ VENDOR FETCH ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;