import express, { Request, Response } from "express";
import { DistrictManager } from "../../services/district.manager";

const router = express.Router();

// Get all district configurations
router.get("/configs", async (req: Request, res: Response) => {
  try {
    const configs = await DistrictManager.getAllDistrictConfigs();
    res.json({ districts: configs });
  } catch (error) {
    console.error("District configs error:", error);
    res.status(500).json({ error: "Failed to fetch district configurations" });
  }
});

// Get specific district configuration
router.get("/config/:districtId", async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const config = await DistrictManager.getDistrictConfig(districtId);
    res.json(config);
  } catch (error) {
    console.error("District config error:", error);
    res.status(500).json({ error: "Failed to fetch district configuration" });
  }
});

// Add new district
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { name, slug, state } = req.body;
    if (!name || !slug || !state) {
      return res.status(400).json({ error: "Name, slug, and state required" });
    }

    const config = await DistrictManager.addNewDistrict({ name, slug, state });
    res.json({ success: true, data: { district: config } });
  } catch (error) {
    console.error("Add district error:", error);
    res.status(500).json({ success: false, error: "Failed to add district" });
  }
});

// Update district configuration
router.put("/config/:districtId", async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.districtId);
    // In production, implement configuration updates
    DistrictManager.clearCache(districtId);
    res.json({ success: true, data: { message: "District configuration cache cleared" } });
  } catch (error) {
    console.error("Update district config error:", error);
    res.status(500).json({ success: false, error: "Failed to update district configuration" });
  }
});

export default router;
