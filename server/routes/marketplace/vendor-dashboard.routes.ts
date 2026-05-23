import { Router } from "express";
import { prisma } from "../../storage";
import { requireAuth } from "../../auth/middleware";

const router = Router();

const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: { code, message, details }
  });

// 🛡️ SOVEREIGN API: Vendor stats endpoint
router.get("/vendor/stats", requireAuth, async (req, res) => {
  try {
    const districtId = (req as any).ctx?.districtId;
    if (!districtId) return failure(res, "DISTRICT_REQUIRED", "District context required", 400);

    const username = (req as any).user?.username as string | undefined;
    if (!username) return failure(res, "AUTH_ERROR", "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
      where: { districtId, slug: username }
    });

    if (!vendor) {
      console.log(`⚠️ [VENDOR DASHBOARD] No vendor found for user=${username} district=${districtId}`);
      // Graceful onboarding response: do not return generic 404 to frontend
      return res.json({
        success: true,
        data: {
          vendorIncomplete: true,
          message: "Vendor profile setup incomplete."
        }
      });
    }

    const [orders, revenue, products] = await Promise.all([
      prisma.order.count({
        where: { vendorId: vendor.id }
      }),

      prisma.order.aggregate({
        where: { vendorId: vendor.id, status: "COMPLETED" },
        _sum: { totalPrice: true }
      }),

      prisma.product.count({
        where: { vendorId: vendor.id }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalOrders: orders,
        totalRevenue: revenue._sum.totalPrice || 0,
        totalProducts: products,
        dsslScore: vendor.dsslScore,
        rating: vendor.rating || 0,
        isVerified: vendor.isVerified
      }
    });
  } catch (err) {
    console.error("Vendor stats error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor stats");
  }
});

export default router;
