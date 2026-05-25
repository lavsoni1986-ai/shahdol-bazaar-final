import { Router, type Request, type Response } from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

// In-memory weights storage to avoid schema drift exceptions
export const dsslWeightsStore = new Map<number, any>();

router.patch("/weights/:districtId", async (req: Request, res: Response) => {
  const districtIdNum = parseInt(req.params.districtId, 10);
  if (isNaN(districtIdNum)) {
    return res.status(400).json({ success: false, error: "Invalid districtId" });
  }
  const { weights } = req.body;

  const config = {
    districtId: districtIdNum,
    weights,
    thresholds: { risk: 70, trust: 30 }
  };
  dsslWeightsStore.set(districtIdNum, config);

  res.json({ success: true, config });
});

export default router;
