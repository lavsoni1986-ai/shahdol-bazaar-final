import express, { Request, Response } from "express";
import { prisma } from "../storage";
import { analyzeProductImage } from "../services/autoCatalog";
import { TierManager } from "../services/tier.manager";
import { generateUniqueProductSlug } from "../repositories/product.repo";

const router = express.Router();

router.post("/auto-catalog", async (req: Request, res: Response) => {
  try {
    const vendorId = req.ctx?.userId || (req.user as any)?.id;
    if (!vendorId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // 🛡️ Sovereign Logic: Allow_Listing = (P_count < P_limit) ∨ (Subscription_Active)
    const limitCheck = await TierManager.checkProductLimit(vendorId);

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: "Subscription limit reached",
        upgradeRequired: true,
        message: limitCheck.message,
        status: limitCheck.status
      });
    }

    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL required" });
    }

    // 🤖 Groq Vision AI: फोटो से डेटा निकालना
    const productData = await analyzeProductImage(imageUrl);

    // Add vendor ID and create product
    const slug = await generateUniqueProductSlug(productData.title || productData.name || "product");
    const fullProductData = {
      ...productData,
      vendorId,
      slug,
      districtId: req.ctx?.districtId || (req as any).districtId, // 🎯 अब यह यूज़र के असली जिले से जुड़ा है
      approved: false // Requires admin approval
    };

    const product = await prisma.product.create({ data: fullProductData });

    res.json({
      success: true,
      product,
      message: "🎉 प्रोडक्ट AI द्वारा कैटलॉग हो गया! एडमिन अप्रूवल के बाद यह लाइव हो जाएगा।"
    });
  } catch (error) {
    console.error("Auto catalog error:", error);
    res.status(500).json({ error: "Auto catalog failed" });
  }
});

export default router;
