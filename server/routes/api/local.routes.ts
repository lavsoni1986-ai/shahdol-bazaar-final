import express, { Request, Response } from "express";
import { getLocalPulse, getPredictiveHomepage } from "../../services/predictive.service";

const router = express.Router();

// Get local context data for dynamic UI
router.get("/pulse", async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.query.districtId as string) || 1;
    const pulseData = await getLocalPulse(districtId);

    res.json({
      districtId,
      ...pulseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Local pulse error:", error);
    res.status(500).json({ error: "Failed to fetch local pulse" });
  }
});

// Get personalized homepage recommendations
router.get("/homepage", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id ? parseInt(req.user.id) : undefined;
    const districtId = parseInt(req.query.districtId as string) || 1;

    const recommendations = await getPredictiveHomepage(userId, districtId);

    res.json({
      userId,
      districtId,
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Homepage recommendations error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

export default router;
