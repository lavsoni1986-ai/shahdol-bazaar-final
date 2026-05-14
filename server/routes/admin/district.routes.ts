import express, { type Request, type Response } from "express";
import { requireAuth, requireSuperAdmin, requireCityAdmin } from "../../auth/middleware";
import { storage, prisma } from "../../storage";

const router = express.Router();

// ============================================
// 🗺️ GEO-GOVERNANCE
// ============================================

// --- GET PUBLIC DISTRICT CONFIG (for homepage) ---
router.get("/districts/:slug", async (req: Request, res: Response) => {
  try {
    const district = await prisma.district.findUnique({
      where: { slug: req.params.slug, isActive: true }
    });

    if (!district) return res.status(404).json({ success: false, error: "District not found" });
    res.json({ success: true, data: district });
  } catch (e) {
    console.error("District fetch error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch district" });
  }
});

// --- GET DISTRICT BY ID ---
router.get("/districts/id/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const district = await storage.getDistrict(id);
    if (!district) {
      return res.status(404).json({ success: false, error: "District not found" });
    }
    return res.json({ success: true, data: district });
  } catch (e) {
    console.error("District fetch error:", e);
    return res.status(500).json({ success: false, error: "Failed to fetch district" });
  }
});

  // --- GET PUBLIC DISTRICT STATS (for homepage) ---
  router.get("/district-stats", async (req: Request, res: Response) => {
    try {
      const districtId = req.ctx?.districtId;
      if (!districtId) {
        return res.status(400).json({ success: false, error: "District context required" });
      }

      // Get real counts from database
      const vendorCount = await storage.getVendorCountByDistrict(districtId);
      const productCount = await storage.getProductCountByDistrict(districtId);

      // For hospitals, count from the hospitals table
      const hospitalCount = await prisma.hospital.count({
        where: { districtId }
      });

      return res.json({
        success: true,
        data: {
          vendorCount: vendorCount || 0,
          productCount: productCount || 0,
          hospitalCount: hospitalCount || 0
        }
      });
    } catch (e) {
      console.error("District stats fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

// --- GET ALL DISTRICTS (Public - for district switcher) ---
router.get("/districts", async (req: Request, res: Response) => {
  try {
    const districts = await storage.getAllDistricts();
    return res.json({ success: true, data: districts });
  } catch (e) {
    console.error("Districts fetch error:", e);
    return res.status(500).json({ success: false, message: "Failed to fetch districts" });
  }
});

// Admin-only mutation routes below
router.use(requireAuth, requireSuperAdmin);

// --- ADMIN: CREATE DISTRICT ---
router.post("/districts", async (req: Request, res: Response) => {
  try {
    const { name, slug, state, isActive } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    const district = await prisma.district.create({
      data: {
        name,
        slug,
        state: state || "Madhya Pradesh",
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return res.status(201).json(district);
  } catch (e) {
    console.error("District creation error:", e);
    return res.status(500).json({ message: "Failed to create district" });
  }
});

// --- ADMIN: UPDATE DISTRICT ---
router.put("/districts/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, state, isActive } = req.body;

    const district = await prisma.district.update({
      where: { id },
      data: { name, slug, state, isActive }
    });

    return res.json({ success: true, data: district });
  } catch (e) {
    console.error("District update error:", e);
    return res.status(500).json({ success: false, error: "Failed to update district" });
  }
});

export default router;
