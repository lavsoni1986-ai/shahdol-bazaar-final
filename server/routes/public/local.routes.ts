import express, { type Request, type Response } from "express";
import { success } from "../../lib/apiResponse";

const router = express.Router();

router.get("/pulse", async (req: any, res) => {
  try {
    const districtId = req.districtId || req.ctx?.districtId;

    return res.json({
      success: true,
      data: {
        weather: "hot",
        temperature: 30,
        isFestival: false,
        eventName: null,
        trafficCondition: "normal",
        localNews: ["District systems normal today"]
      }
    });
  } catch (e) {
    return res.json({
      success: true,
      data: {
        weather: "hot",
        temperature: 30,
        isFestival: false,
        eventName: null,
        trafficCondition: "normal",
        localNews: ["District systems normal today"]
      }
    });
  }
});

export default router;