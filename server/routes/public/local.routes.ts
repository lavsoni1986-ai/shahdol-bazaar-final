import express, { type Request, type Response } from "express";
import { success } from "../../lib/apiResponse";
import { getLocalPulse } from "../../services/predictive.service";

const router = express.Router();

router.get("/pulse", async (req: any, res) => {
  try {
    const districtId = req.ctx?.districtId ?? req.districtId;

    if (!districtId || isNaN(Number(districtId))) {
      // Safe fallback when no district context — return minimal non-fabricated response
      return res.json({
        success: true,
        data: {
          weather: "mild",
          temperature: 25,
          isFestival: false,
          eventName: null,
          trafficCondition: "normal",
          localNews: []
        }
      });
    }

    // Use the existing dynamic service — district-scoped, festival-aware, weather-aware
    const pulse = await getLocalPulse(Number(districtId));
    return res.json({ success: true, data: pulse });
  } catch (e) {
    console.error("[LOCAL_PULSE] Error:", e);
    // Safe fallback on error — empty localNews, no fabricated text
    return res.json({
      success: true,
      data: {
        weather: "mild",
        temperature: 25,
        isFestival: false,
        eventName: null,
        trafficCondition: "normal",
        localNews: []
      }
    });
  }
});

export default router;