import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertShopSchema, insertUserSchema, insertOfferSchema } from "../shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  console.log("✅ API LOADED: Final Shahdol Bazaar Sync");

  // --- 1. AUTHENTICATION ---
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Admin bypass logic for ID 1 to ensure access
      if (user.id === 1) {
        await storage.updateUser(user.id, { role: "admin", isAdmin: true });
      }
      return res.json(user);
    } catch (e) {
      return res.status(500).json({ message: "Login Failed" });
    }
  });

  // --- 2. SHOP ROUTES ---
  app.get("/api/shops", async (req: Request, res: Response) => {
    try {
      const allShops = await storage.getShops();
      return res.json({ data: allShops }); // Frontend expected format
    } catch (e) {
      return res.status(500).json({ message: "Error fetching shops" });
    }
  });

  // ✅ CRITICAL FIX: Shop creation with mobile mapping
  app.post("/api/partner/shop/create-default", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });

      const existingShop = await storage.getShopByOwnerId(userId);
      if (existingShop) return res.status(400).json({ message: "Shop already exists" });

      // Handle phone/mobile number field mismatch from frontend
      const rawData = {
        ...req.body,
        ownerId: userId,
        mobile: req.body.mobile || req.body.mobileNumber || req.body.phone || "0000000000",
        approved: true,
        isVerified: true
      };

      const shopData = insertShopSchema.parse(rawData);
      const newShop = await storage.createShop(shopData);
      
      // Update role to seller so Partner Dashboard activates
      await storage.updateUser(userId, { role: "seller" });
      
      console.log(`✅ [SHOP LIVE] Created for User: ${userId}`);
      return res.status(201).json(newShop);
    } catch (e: any) {
      console.error("❌ Shop Create Error:", e);
      return res.status(400).json({ message: "Check details: Address and Mobile are required" });
    }
  });

  app.get("/api/partner/shop/:ownerId", async (req: Request, res: Response) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) return res.json(null);
      const shop = await storage.getShopByOwnerId(ownerId);
      return res.json(shop || null);
    } catch (e) {
      return res.json(null);
    }
  });

  // --- 3. OFFERS & NEWS TICKER (Neon Sync) ---
  app.get("/api/offers", async (_req: Request, res: Response) => {
    try {
      const offers = await storage.getOffers();
      return res.json(offers);
    } catch (e) {
      return res.status(500).json({ message: "Ticker fetch failed" });
    }
  });

  app.post("/api/offers", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      const userId = Number(req.headers["x-user-id"]);
      const newOffer = await storage.createOffer({ content, isActive: true, userId });
      console.log("✅ News LIVE:", newOffer.content);
      return res.json(newOffer);
    } catch (e) {
      return res.status(500).json({ message: "News publish failed" });
    }
  });

  // Stats for Admin Dashboard
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const shops = await storage.getShops();
      return res.json({ visitors: 142, totalProducts: shops.length });
    } catch (e) {
      return res.status(500).json({ message: "Stats failed" });
    }
  });

  return httpServer;
}