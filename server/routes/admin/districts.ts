import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireSuperAdmin } from "../../auth/middleware";

const router = Router();

// 📊 GET: साम्राज्य का लाइव स्टेटस (All Districts with Stats)
router.get("/", requireSuperAdmin, async (req: Request, res: Response) => {
  const districts = await prisma.district.findMany({
    include: {
      _count: {
        select: { vendors: true, products: true }
      }
    }
  });
  res.json(districts);
});

// 🔍 GET: विशिष्ट जिला प्राप्त करना
router.get("/:id", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = Number(req.params.id);

    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid districtId' });
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId },
    });

    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }

    return res.json(district);
  } catch (err) {
    console.error('[DISTRICT_FETCH_ERROR]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ➕ POST: नया जिला लॉन्च करना (Rewa, Jabalpur, etc.)
router.post("/", requireSuperAdmin, async (req: Request, res: Response) => {
  const { name, slug, themeConfig, config, state } = req.body;
  try {
    const newDistrict = await prisma.district.create({
      data: {
        name,
        slug,
        themeConfig,
        config,
        state: state || "Madhya Pradesh"
      }
    });
    res.status(201).json(newDistrict);
  } catch (error) {
    res.status(400).json({ error: "District creation failed - Slug must be unique" });
  }
});

// 🔒 PATCH: जिले को लॉक करना या कॉन्फ़िगरेशन बदलना
router.patch("/:id", requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatedData = req.body;
  const district = await prisma.district.update({
    where: { id: parseInt(id) },
    data: updatedData
  });
  res.json(district);
});

export default router;
