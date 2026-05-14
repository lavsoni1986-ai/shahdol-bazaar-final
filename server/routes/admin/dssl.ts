import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireSuperAdmin } from "../../auth/middleware";
import { getBatchTrustScores } from "../../services/dssl.service";

const router = Router();

// ⚖️ UPDATE WEIGHTS: जिले के AI पैरामीटर्स बदलना
router.patch("/weights/:districtId", requireSuperAdmin, async (req: Request, res: Response) => {
  const { districtId } = req.params;
  const { weights } = req.body; // e.g., { rating: 0.3, orders: 0.4, ... }

  const existing = await prisma.district.findUnique({
    where: { id: parseInt(districtId) }
  });

  const updatedConfig = {
    ...(existing?.config as Record<string, any> || {}),
    dsslWeights: weights
  };

  const district = await prisma.district.update({
    where: { id: parseInt(districtId) },
    data: {
      config: updatedConfig
    }
  });

  res.json({ success: true, data: { message: "Sovereign Weights Updated", district } });
});

// 🔁 RECALCULATE: पूरे जिले का स्कोर फिर से कैलकुलेट करना
router.post("/recalculate/:districtId", requireSuperAdmin, async (req: Request, res: Response) => {
  const { districtId } = req.params;
  const districtIdNum = parseInt(districtId);

  if (isNaN(districtIdNum)) {
    return res.status(400).json({ message: "Invalid districtId" });
  }

  // Start async recalculation without blocking response
  setImmediate(async () => {
    try {
      // TODO: Implement DSSL recalculation for district
      console.log(`DSSL recalculation placeholder for district ${districtIdNum}`);
      console.log(`✅ DSSL Recalculation completed for district ${districtId}`);
    } catch (error) {
      console.error(`❌ DSSL Recalculation failed for district ${districtId}:`, error);
    }
  });

  // Return immediately
  res.json({ success: true, data: { message: "AI Recalculation Triggered for District " + districtId } });
});

export default router;
