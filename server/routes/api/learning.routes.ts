import express, { Request, Response } from "express";
import { MultiDistrictLearner } from "../../services/multi.district.learner";

const router = express.Router();

// Get district learning insights
router.get("/learning/:districtId", async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const learningData = await MultiDistrictLearner.getDistrictLearning(districtId);
    res.json(learningData);
  } catch (error) {
    console.error("District learning error:", error);
    res.status(500).json({ error: "Failed to fetch district learning data" });
  }
});

// Cross-district analysis
router.get("/cross-district", async (req: Request, res: Response) => {
  try {
    const analysis = await MultiDistrictLearner.crossDistrictLearning();
    res.json(analysis);
  } catch (error) {
    console.error("Cross-district analysis error:", error);
    res.status(500).json({ error: "Failed to perform cross-district analysis" });
  }
});

// Manual learning update
router.post("/update-learning", async (req: Request, res: Response) => {
  try {
    await MultiDistrictLearner.updateLearningData();
    res.json({ success: true, data: { message: "Learning data updated successfully" } });
  } catch (error) {
    console.error("Learning update error:", error);
    res.status(500).json({ success: false, error: "Failed to update learning data" });
  }
});

export default router;
