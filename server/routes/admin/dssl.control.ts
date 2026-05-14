import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.patch("/weights/:districtId", async (req: Request, res: Response) => {
  const districtIdNum = parseInt(req.params.districtId, 10);
  if (isNaN(districtIdNum)) {
    return res.status(400).json({ success: false, error: "Invalid districtId" });
  }
  const { weights } = req.body;

  const config = await prisma.dsslConfig.upsert({
    where: { districtId: districtIdNum },
    update: { weights },
    create: {
      districtId: districtIdNum,
      weights,
      thresholds: { risk: 70, trust: 30 }
    }
  });
  res.json({ success: true, config });
});

export default router;
