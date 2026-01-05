import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import multer, { type StorageEngine } from "multer";
import { type Server } from "http";
import { storage } from "./storage.js";
import { insertShopSchema, insertProductSchema, insertOfferSchema, insertCategorySchema, products, users, shops, categories } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { ilike, or, and, eq, sql } from "drizzle-orm";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
  // --- 0. DEV UTILITY: CLEAN DATABASE (products, shops, users) ---
  // Placed first so it is always registered.
  const cleanupHandler = async (_req: Request, res: Response) => {
    try {
      console.warn("⚠️ DATABASE CLEANUP TRIGGERED");
      await db.delete(products);
      await db.delete(shops);
      await db.delete(users);
      await db.insert(users).values({
        username: "admin",
        password: "shahdol123",
        role: "admin",
        isAdmin: true,
        shopName: null as any,
        shopAddress: null as any,
        mapsLink: null as any,
      });
      console.log("DATABASE CLEANED - READY FOR NEW REGISTRATION");
      return res.status(200).send("DATABASE CLEANED");
    } catch (e: any) {
      console.error("Cleanup failed", e?.message);
      return res.status(500).send("Cleanup failed");
    }
  };
  app.get("/api/debug/cleanup", cleanupHandler);
  app.post("/api/debug/cleanup", cleanupHandler);

  // --- HEALTH CHECK ---
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      return res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Health check failed:", err?.message);
      return res.status(500).json({ status: "error", message: "DB unavailable" });
    }
  });
  // Use a writable location on Vercel (read-only FS except /tmp)
  const uploadDir = process.env.VERCEL
    ? path.join("/tmp", "uploads")
    : path.resolve(process.cwd(), "public", "uploads");
  try {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o777 });
  } catch (err: any) {
    console.error("❌ Failed to ensure uploads dir:", err?.message || err);
  }
  app.use("/uploads", express.static(uploadDir));

  const uploadStorage: StorageEngine = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) =>
      cb(null, uploadDir),
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename.replace(/\s+/g, "_"));
    },
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  });

  // --- 0b. FETCH LOGGED-IN OWNER SHOP (Partner Dashboard) ---
  app.get("/api/shops/mine", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || {});
    } catch (e) {
      console.error("Failed to fetch my shop", e);
      return res.status(200).json({});
    }
  });

  // --- 0b. FETCH LOGGED-IN OWNER SHOP (Partner Dashboard) ---
  app.get("/api/shops/mine", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || {});
    } catch (e) {
      console.error("Failed to fetch my shop", e);
      return res.status(200).json({});
    }
  });
  // --- 0b. FETCH LOGGED-IN OWNER SHOP (used by Partner Dashboard) ---
  // --- 1. LOGIN ---
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) return res.status(401).json({ message: "Invalid" });
    res.json(user);
  });

  // --- 2. FETCH ALL PRODUCTS (FOR HOME & ADMIN) ---
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const shopId = Number(req.query?.shopId);
      const search = typeof req.query?.search === "string" ? req.query.search : null;
      const includeAll = String(req.query?.includeAll || "").toLowerCase() === "true";
      const statusParam = typeof req.query?.status === "string" ? req.query.status : null;
      const categoryParamRaw = typeof req.query?.category === "string" ? req.query.category : null;
      const normalizedCategory = categoryParamRaw
        ? decodeURIComponent(categoryParamRaw).trim().toLowerCase()
        : null;

      let approved: boolean | null = null;
      if (typeof req.query?.approved === "string") {
        const flag = req.query.approved.toLowerCase();
        if (flag === "true") approved = true;
        else if (flag === "false") approved = false;
      }

      const approvedForAllProducts = includeAll ? approved : true;

      let rows;
      if (Number.isFinite(shopId) && shopId > 0) {
        rows = await storage.getProductsByShopIdWithSeller(shopId, search);
      } else {
        rows = await storage.getAllProductsWithSeller(approvedForAllProducts, search);
      }

      if (Number.isFinite(shopId) && shopId > 0) {
        if (!includeAll) {
          rows = rows.filter((p: any) => p?.approved === true && (p?.status || "").toLowerCase() !== "deleted");
        } else if (approved !== null) {
          rows = rows.filter((p: any) => p?.approved === approved);
        }
      }

      if (statusParam) {
        rows = rows.filter((p: any) => (p?.status || "").toLowerCase() === statusParam.toLowerCase());
      } else if (!includeAll) {
        rows = rows.filter((p: any) => (p?.status || "").toLowerCase() !== "deleted");
      }

      if (normalizedCategory) {
        rows = rows.filter((p: any) => (p?.category || "").trim().toLowerCase() === normalizedCategory);
      }

      console.log("Sending products count:", rows.length);
      return res.json(rows);
    } catch (e) {
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // --- 2c. FETCH ALL SHOPS (ADMIN SELLER LIST) ---
  app.get("/api/shops", async (_req: Request, res: Response) => {
    try {
      setNoStore(res);
      const shops = await storage.getShops();
      console.log("Sending shops count:", shops.length);
      return res.json({ data: shops });
    } catch (e) {
      console.error("Failed to fetch shops", e);
      return res.status(500).json({ message: "Failed to fetch shops" });
    }
  });

  // --- 2a. ADMIN/ALL PRODUCTS WITH FILTERS (supports approved/status) ---
  app.get("/api/products/all", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const search = typeof req.query?.search === "string" ? req.query.search : null;
      const approvedParam = req.query?.approved;
      const statusParam = typeof req.query?.status === "string" ? req.query.status : null;

      let approved: boolean | null = null;
      if (typeof approvedParam === "string") {
        approved = approvedParam.toLowerCase() === "true"
          ? true
          : approvedParam.toLowerCase() === "false"
            ? false
            : null;
      }

      let rows = await storage.getAllProductsWithSeller(approved, search);
      if (statusParam) {
        rows = rows.filter((p) => (p as any)?.status === statusParam);
      }

      return res.json(rows);
    } catch (e) {
      console.error("Failed to fetch all products", e);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // --- 2b. FETCH SINGLE PRODUCT ---
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid product id" });
      }

      const product = await storage.getProductWithSeller(id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      return res.json(product);
    } catch (e) {
      console.error("Fetch product failed", e);
      return res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // --- 3. CREATE PRODUCT (INSTANT LIVE) ---
  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      console.log("Adding Product Body:", req.body);
      const userId = Number(req.headers["x-user-id"]) || 1;
      const shopId = Number(req.body?.shopId) || 1;
      const category = (req.body?.category as string) || "General";

      const productData = insertProductSchema.parse({
        ...req.body,
        shopId,
        sellerId: userId,
        price: String(req.body?.price ?? "0"),
        imageUrl: req.body?.imageUrl ?? "",
        images: Array.isArray(req.body?.images) ? req.body.images : [],
        category,
        approved: false,
        status: "pending",
      });

      const newProduct = await storage.createProduct(productData);
      return res.status(201).json(newProduct);
    } catch (e: any) {
      console.error("Create product failed", e?.message);
      return res.status(400).json({ message: "Invalid data: Check all fields" });
    }
  });

  // --- 4. IMAGE UPLOAD ---
  app.post("/api/upload", upload.array("images"), async (req: Request, res: Response) => {
    try {
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) return res.status(400).json({ message: "No files" });
      const urls = files.map((f) => `/uploads/${f.filename}`);
      return res.status(201).json({ urls });
    } catch (e) {
      return res.status(500).json({ message: "Upload failed" });
    }
  });

  // --- 5. BANNERS ---
  app.get("/api/banners", async (_req, res) => {
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.post("/api/banners", upload.single("image"), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const image = file ? `/uploads/${file.filename}` : typeof req.body?.image === "string" ? req.body.image : "";
      if (!image) return res.status(400).json({ message: "Image required" });

      const payload = {
        image,
        title: typeof req.body?.title === "string" ? req.body.title : "",
        link: typeof req.body?.link === "string" ? req.body.link : "/",
      };

      const created = await storage.createBanner(payload);
      res.status(201).json(created);
    } catch (e: any) {
      console.error("Create banner failed", e?.message);
      return res.status(400).json({ message: "Create failed" });
    }
  });

  app.patch("/api/banners/:id", upload.single("image"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = (await storage.getBanners()).find((b) => b.id === id);
      if (!existing) return res.status(404).json({ message: "Banner not found" });

      const file = (req as any).file as Express.Multer.File | undefined;
      const image = file
        ? `/uploads/${file.filename}`
        : typeof req.body?.image === "string" && req.body.image
          ? req.body.image
          : existing.image;

      const payload = {
        title: typeof req.body?.title === "string" ? req.body.title : existing.title,
        link: typeof req.body?.link === "string" ? req.body.link : existing.link,
        image,
      };

      const updated = await storage.updateBanner(id, payload);
      return res.json(updated);
    } catch (e: any) {
      console.error("Update banner failed", e?.message);
      return res.status(400).json({ message: "Update failed" });
    }
  });

  app.delete("/api/banners/:id", async (req, res) => {
    await storage.deleteBanner(Number(req.params.id));
    res.json({ success: true });
  });

  // --- 6. OFFERS ---
  app.get("/api/offers", async (_req, res) => {
    const offers = await storage.getOffers();
    res.json(offers);
  });

  app.post("/api/offers", async (req, res) => {
    const offer = await storage.createOffer({ ...req.body, userId: 1, isActive: true });
    res.status(201).json(offer);
  });

  app.delete("/api/offers/:id", async (req, res) => {
    await storage.deleteOffer(Number(req.params.id));
    res.json({ success: true });
  });

  // --- 7. PARTNER SHOP ROUTES ---
  app.get("/api/partner/shop", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || null);
    } catch (e) {
      return res.json(null);
    }
  });

  // --- 7b. SHOP FOR LOGGED-IN OWNER ---
  app.get("/api/shops/mine", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || null);
    } catch (e) {
      console.error("Fetch my shop failed", e);
      return res.status(500).json({ message: "Failed to fetch shop" });
    }
  });

  app.get("/api/partner/shop/:ownerId", async (req: Request, res: Response) => {
    try {
      const ownerId = Number(req.params.ownerId);
      if (!Number.isInteger(ownerId)) return res.json(null);
      const shop = await storage.getShopByOwnerId(ownerId);
      return res.json(shop || null);
    } catch (e) {
      return res.json(null);
    }
  });

  app.post("/api/partner/shop/create-default", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });

      const existingShop = await storage.getShopByOwnerId(userId);
      if (existingShop) {
        await storage.updateUser(userId, { role: "seller" });
        return res.status(200).json(existingShop);
      }

      const rawData = {
        ...req.body,
        ownerId: userId,
        name: String(req.body?.name || req.body?.shopName || "Temp Shop"),
        category: String(req.body?.category || "General"),
        description: String(req.body?.description || "Auto-created default shop"),
        address: String(req.body?.address || req.body?.shopAddress || "Shahdol"),
        phone: String(req.body?.phone || "0000000000"),
        mobile: String(req.body?.mobile || req.body?.mobileNumber || req.body?.phone || "0000000000"),
        contactNumber: String(req.body?.contactNumber || req.body?.mobile || req.body?.phone || "0000000000"),
        approved: true,
        isVerified: true,
      };

      const shopData = insertShopSchema.parse(rawData);
      const newShop = await storage.createShop(shopData);
      await storage.updateUser(userId, { role: "seller" });

      console.log(`✅ [SHOP LIVE] Created for User: ${userId}`);
      return res.status(201).json(newShop);
    } catch (e: any) {
      console.error("❌ Shop Create Error:", e);
      return res.status(400).json({ message: "Check details: Address and Mobile are required" });
    }
  });

  app.patch("/api/products/:id", upload.single("image"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ message: "Product not found" });

      const file = (req as any).file as Express.Multer.File | undefined;
      const uploadedUrl = file ? `/uploads/${file.filename}` : undefined;
      const imageUrl = uploadedUrl ?? req.body?.imageUrl ?? existing.imageUrl ?? "";

      const payload = {
        name: req.body?.name ?? existing.name,
        price: String(req.body?.price ?? existing.price ?? "0"),
        description: req.body?.description ?? existing.description ?? "",
        category: req.body?.category ?? existing.category,
        status: req.body?.status ?? existing.status,
        imageUrl,
      };

      const updated = await storage.updateProduct(id, payload);
      return res.json(updated);
    } catch (e: any) {
      console.error("Update product failed", e);
      return res.status(500).json({ message: e?.message || "Update failed" });
    }
  });

  app.patch("/api/products/:id/approve", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ message: "Product not found" });

      const updated = await storage.updateProduct(id, { approved: true, status: "approved" });
      return res.json(updated);
    } catch (e: any) {
      console.error("Approve product failed", e?.message);
      return res.status(500).json({ message: "Approval failed" });
    }
  });

  // (cleanupHandler registered at top)

  // --- 9. USER PROFILE (SHOP DETAILS ON PARTNER DASHBOARD) ---
  app.patch("/api/user/profile", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.headers["x-user-id"]);
      if (!userId) return res.status(401).json({ message: "User identity missing" });

      const shopName = typeof req.body?.shopName === "string" ? req.body.shopName : "";
      const shopAddress = typeof req.body?.shopAddress === "string" ? req.body.shopAddress : "";
      const mapsLink = typeof req.body?.mapsLink === "string" ? req.body.mapsLink : "";
      const contactNumber = typeof req.body?.contactNumber === "string" ? req.body.contactNumber : "";

      await storage.updateUser(userId, { shopName, shopAddress, mapsLink });

      const ownerShop = await storage.getShopByOwnerId(userId);
      if (ownerShop) {
        await storage.updateShop(ownerShop.id, {
          name: shopName || ownerShop.name,
          address: shopAddress || ownerShop.address,
          contactNumber: contactNumber || ownerShop.contactNumber,
          category: ownerShop.category || "General",
          phone: ownerShop.phone || contactNumber || ownerShop.mobile || "0000000000",
          mobile: ownerShop.mobile || contactNumber || ownerShop.phone || "0000000000",
        });
      }

      return res.json({ success: true });
    } catch (e: any) {
      console.error("Profile update failed", e?.message);
      return res.status(400).json({ message: "Profile update failed" });
    }
  });

  // --- 10. CATEGORIES ---
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      setNoStore(res);
      const data = await storage.getCategories();
      return res.json(data);
    } catch (e: any) {
      console.error("Categories fetch failed", e);
      return res.status(500).json({
        message: "Failed to fetch categories",
        error: e?.message || e,
      });
    }
  });

  app.post("/api/categories", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const parsed = insertCategorySchema.parse({
        name: (req.body?.name || "").trim(),
        imageUrl: typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : undefined,
      });
      const created = await storage.createCategory(parsed);
      return res.status(201).json(created);
    } catch (e: any) {
      console.error("Create category failed", e);
      return res.status(400).json({ message: e?.message || "Invalid category", error: e });
    }
  });

  app.patch("/api/categories/:id", upload.single("image"), async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = (await storage.getCategories()).find((c) => c.id === id);
      if (!existing) return res.status(404).json({ message: "Category not found" });

      const file = (req as any).file as Express.Multer.File | undefined;
      const incomingName = typeof req.body?.name === "string" ? req.body.name.trim() : existing.name;
      const incomingImageUrl =
        file
          ? `/uploads/${file.filename}`
          : typeof req.body?.imageUrl === "string" && req.body.imageUrl.trim()
            ? req.body.imageUrl.trim()
            : existing.imageUrl ?? null;

      if (!incomingName) return res.status(400).json({ message: "Name required" });

      const updated = await storage.updateCategory(id, { name: incomingName, imageUrl: incomingImageUrl ?? null });
      return res.json(updated);
    } catch (e: any) {
      console.error("Update category failed", e?.message);
      return res.status(400).json({ message: e?.message || "Update failed" });
    }
  });

  app.delete("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteCategory(id);
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Delete category failed", e);
      return res.status(400).json({ message: "Delete failed", error: e?.message || e });
    }
  });

  return httpServer;
}