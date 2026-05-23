import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../../storage";

const router = Router();

const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: { code, message, details }
  });

// --- HOME DATA AGGREGATOR ---
router.get("/home-data", async (req: Request, res: Response) => {
  try {
    if (!(req as any).districtId) {
      return failure(res, "DISTRICT_REQUIRED", "District context required", 400);
    }
    const districtId = (req as any).districtId as number;

    const districts = await prisma.district
      .findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, state: true }
      })
      .catch(() => []);

    const products = await prisma.product
      .findMany({
        where: {
          approved: true,
          status: { in: ["APPROVED", "approved", "ACTIVE", "active"] }
        },
        take: 10,
        select: {
          id: true,
          price: true,
          imageUrl: true,
          title: true,
          vendor: { select: { name: true } }
        }
      })
      .catch(() => []);

    const categories = await prisma.category
      .findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true }
      })
      .catch(() => []);

    const stats = await prisma.vendor
      .count({
        where: { districtId }
      })
      .then((vendorCount) => ({
        vendorCount: vendorCount || 0,
        productCount: products.length || 0,
        categoryCount: categories.length || 0
      }))
      .catch(() => ({ vendorCount: 0, productCount: 0, categoryCount: 0 }));

    return res.json({
      success: true,
      data: {
        districts: districts || [],
        products: products || [],
        categories: categories || [],
        stats: stats || {}
      }
    });
  } catch (err: unknown) {
    console.error("Home data fetch failed:", err instanceof Error ? err.message : err);
    return failure(res, "SERVER_ERROR", "Failed to load home data", 500);
  }
});

export default router;

