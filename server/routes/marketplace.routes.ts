// Frameworks
import { Router } from "express";

// Database
import { storage, prisma } from "../storage";

// Security
import { optionalAuth, requireAuth, requireSuperAdmin } from "../auth/middleware";

// Validation
import { validateQuery } from "../middleware/validate";
import { productsQueryDTO } from "../dto/marketplace.dto";

const router = Router();

// --- FETCH STORES BY DISTRICT ---
router.get("/stores", async (req: Request, res: Response) => {
  try {
    // Get district from query parameter
    const districtSlug = String(req.query?.district || "").toLowerCase();

    let districtId = req.districtId || 2; // Default Shahdol

    if (districtSlug) {
      const district = await prisma.district.findFirst({
        where: {
          slug: {
            equals: districtSlug,
            mode: "insensitive"
          }
        }
      });
      if (district) districtId = district.id;
    }

    const limit = Number(req.query?.limit) || 4;

    const stores = await prisma.vendor.findMany({
      where: {
        districtId,
        status: "APPROVED" // 🛡️ Sovereign Guard
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      data: stores,
      count: stores.length
    });
  } catch (e) {
    console.error("Marketplace stores fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch stores" });
  }
});

// --- FETCH STORE BY SLUG ---
router.get("/marketplace/stores/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const districtSlug = req.query.district as string;
    if (!districtSlug) {
      return res.status(400).json({ message: "District slug is required" });
    }

    console.log(`[MARKETPLACE] Fetching store details for slug: ${slug} in district: ${districtSlug}`);

    // First get district to get districtId
    const district = await prisma.district.findFirst({
      where: { slug: districtSlug, isActive: true },
      select: { id: true }
    });
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }

    const store = await storage.getVendorBySlug(slug, district.id);

    if (!store) {
      console.log(`[MARKETPLACE] Store NOT FOUND in Vendor table: ${slug}`);
      return res.status(404).json({ message: "Store not found" });
    }

    // Fetch ALL products for this vendor (show all, not just approved)
    const products = await prisma.product.findMany({
      where: { vendorId: store.id },
      select: {
        id: true,
        title: true,
        price: true,
        mrp: true,
        imageUrl: true,
        category: true,
        description: true,
        stock: true,
        isTrending: true,
        approved: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ ...store, products });
  } catch (e) {
    console.error(`[MARKETPLACE] Error fetching store ${req.params.slug}:`, e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// --- FETCH PRODUCTS BY DISTRICT ---
router.get("/products", validateQuery(productsQueryDTO), async (req: Request, res: Response) => {
  try {
    // ✅ DTO VALIDATION: Query params are validated and transformed
    const {
      district,
      districtId: districtIdParam,
      category,
      search,
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice
    } = req.query;

    let effectiveDistrictId = req.districtId || 2;

    if (districtIdParam) {
      effectiveDistrictId = districtIdParam;
    } else if (district) {
      const districtRecord = await prisma.district.findFirst({
        where: { slug: { equals: district, mode: "insensitive" } }
      });
      if (districtRecord) {
        effectiveDistrictId = districtRecord.id;
      }
    }

    // Build where clause with validated filters
    const where: any = {
      approved: true,
    };

    // District filter
    if (effectiveDistrictId) {
      where.districtId = effectiveDistrictId;
    }

    // Category filter
    if (category) {
      where.category = { contains: category, mode: "insensitive" };
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } }
      ];
    }

    // Price filters
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            rating: true,
            totalReviews: true
          }
        },
        category: true
      },
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: sortOrder }
    });

    // Map to frontend format
    const mappedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.title || "Untitled",
      title: product.title,
      price: product.price?.toString() || "0",
      mrp: product.mrp?.toString() || null,
      imageUrl: product.imageUrl || null,
      category: product.category?.name || null,
      shopName: product.vendor?.name || null,
      stock: product.stock || 0,
      isTrending: product.isTrending || false,
      vendorScore: 0 // TODO: calculate if needed
    }));

    return res.json({
      data: mappedProducts,
      count: mappedProducts.length
    });
  } catch (e) {
    console.error("Marketplace products fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// --- FETCH SINGLE PRODUCT ---
router.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await storage.getProductWithSeller(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Only show approved products to public
    if (!product.approved || product.status !== "approved") {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(product);
  } catch (e) {
    console.error("Fetch product failed", e);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

// --- FETCH CATEGORIES ---
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
      },
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return res.json({
      data: categories,
      count: categories.length
    });
  } catch (e) {
    console.error("Marketplace categories fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// --- FETCH PUBLIC STATS ---
router.get("/public/stats", async (req: Request, res: Response) => {
  try {
    const districtSlug = String(req.query?.district || "").toLowerCase();

    let districtId = 2; // Default Shahdol

    if (districtSlug) {
      const district = await prisma.district.findFirst({
        where: {
          slug: {
            equals: districtSlug,
            mode: "insensitive"
          }
        }
      });
      if (district) districtId = district.id;
    }

    const [vendors, services, activeUsers] = await Promise.all([
      prisma.vendor.count({ where: { districtId, status: "APPROVED" } }),
      prisma.product.count({ where: { districtId, approved: true } }),
      prisma.user.count({ where: { districtId, role: "customer" } })
    ]);

    return res.json({ vendors, services, activeUsers });
  } catch (e) {
    console.error("Marketplace stats fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// Alias for stores
router.get("/shops", async (req: Request, res: Response) => {
  try {
    // Get district from query parameter
    const districtSlug = String(req.query?.district || "").toLowerCase();

    let districtId = req.districtId || 2; // Default Shahdol

    if (districtSlug) {
      const district = await prisma.district.findFirst({
        where: {
          slug: {
            equals: districtSlug,
            mode: "insensitive"
          }
        }
      });
      if (district) districtId = district.id;
    }

    const limit = Number(req.query?.limit) || 4;

    const stores = await prisma.vendor.findMany({
      where: {
        districtId,
        status: "APPROVED" // 🛡️ Sovereign Guard
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      data: stores,
      count: stores.length
    });
  } catch (e) {
    console.error("Marketplace shops fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch shops" });
  }
});

export default router;
