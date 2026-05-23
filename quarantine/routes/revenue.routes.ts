import express, { Request, Response } from "express";
import { prisma } from "../../storage";
import { RevenueEngine } from "../../services/revenue.engine";
// import { triggerAdScheduling } from "../../workers/ad.scheduler"; // QUARANTINED
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { success, failure } from "../../lib/apiResponse";

const router = express.Router();

// 🔒 सभी रेवेन्यू राउट्स के लिए एडमिन होना अनिवार्य है
router.use(requireAuth, requireSuperAdmin);

// Get revenue metrics
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const districtId = req.ctx?.districtId;
    if (!districtId) {
      return res.status(400).json(failure("DISTRICT_REQUIRED", "District context required"));
    }
    console.log("💰 [REVENUE] Getting metrics for district:", districtId);

    const metrics = await RevenueEngine.getRevenueMetrics(districtId);
    return res.json(success(metrics));
  } catch (error) {
    console.error("Revenue metrics error:", error);
    return res.status(500).json(failure("SERVER_ERROR", "Failed to fetch revenue metrics"));
  }
});

// Create advertisement
router.post("/advertisements", async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId;
    if (!merchantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { title, description, imageUrl, bidAmount, dailyBudget, targetCategories, targetTimeSlots } = req.body;

    if (!title || !bidAmount || !dailyBudget) {
      return res.status(400).json({ error: "Title, bid amount, and daily budget required" });
    }

    const advertisement = await RevenueEngine.createAdvertisement(merchantId, {
      title,
      description,
      imageUrl,
      bidAmount: parseFloat(bidAmount),
      dailyBudget: parseFloat(dailyBudget),
      targetCategories,
      targetTimeSlots
    });

    res.json({
      success: true,
      advertisement,
      message: "🎯 Advertisement created! It will be reviewed and activated soon."
    });
  } catch (error) {
    console.error("Create advertisement error:", error);
    res.status(500).json({ error: "Failed to create advertisement" });
  }
});

// Get merchant's advertisements
router.get("/advertisements", async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId;

    const advertisements = await prisma.advertisement.findMany({
      where: merchantId ? { merchantId } : {},
      include: {
        adSlots: true
      },
      orderBy: { startDate: 'desc' }
    });

    res.json({ advertisements });
  } catch (error) {
    console.error("Get advertisements error:", error);
    res.status(500).json({ error: "Failed to fetch advertisements" });
  }
});

// Get ad rankings for user
router.post("/ad-rankings", async (req: Request, res: Response) => {
  try {
    const { userIntent, userLocation } = req.body;
    const districtId = req.ctx?.districtId;

    if (!userIntent) {
      return res.status(400).json({ error: "User intent required" });
    }
    if (!districtId) {
      return res.status(400).json({ error: "District context required" });
    }

    const rankings = await RevenueEngine.rankAdsForUser(
      req.ctx?.userId || 0,
      districtId,
      userIntent,
      userLocation
    );

    res.json({ rankings });
  } catch (error) {
    console.error("Ad rankings error:", error);
    res.status(500).json({ error: "Failed to get ad rankings" });
  }
});

// Manual ad scheduling trigger (for admin) - QUARANTINED
// router.post("/trigger-ad-scheduling", async (req: Request, res: Response) => {
//   try {
//     triggerAdScheduling();
//     res.json({ success: true, data: { message: "Ad scheduling triggered manually" } });
//   } catch (error) {
//     console.error("Trigger ad scheduling error:", error);
//     res.status(500).json({ success: false, error: "Failed to trigger ad scheduling" });
//   }
// });

// Process subscription payment
router.post("/process-subscription", async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId;
    if (!merchantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { amount, tier } = req.body;

    if (!amount || !tier) {
      return res.status(400).json({ error: "Amount and tier required" });
    }

    const result = await RevenueEngine.processSubscriptionPayment(merchantId, parseFloat(amount), tier);

    res.json(result);
  } catch (error) {
    console.error("Process subscription error:", error);
    res.status(500).json({ error: "Failed to process subscription payment" });
  }
});

export default router;
