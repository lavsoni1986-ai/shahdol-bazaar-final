import express, { type Express, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { type Server } from "http";
import { storage } from "./storage.js";
import { insertShopSchema, insertProductSchema, insertOfferSchema, insertCategorySchema, insertOrderSchema, insertReviewSchema, insertProductImageSchema, products, productImages, users, shops, categories, orders, reviews } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { ilike, or, and, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth/password.js";
import { generateTokenPair, verifyRefreshToken, JWTPayload } from "./auth/jwt.js";
import { requireAuth, requireRole, optionalAuth, Role, mapLegacyRoleToNewRole, requireMerchant, requireSuperAdmin, requireCityAdmin } from "./auth/middleware.js";
import { loginLimiter, refreshTokenLimiter } from "./auth/rateLimiter.js";

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
        password: hashPassword("shahdol123"),
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
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const uploadStorage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "shahdol-bazaar",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    }),
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  });

  // ============================================
  // AUTHENTICATION ROUTES (Public)
  // ============================================

  // --- 1. LOGIN (JWT-based) ---
  app.post("/api/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password (strict - no plaintext fallback)
      const isValidPassword = verifyPassword(password, user.password as string);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Get user's shop if merchant
      let shopId: number | null = null;
      if (user.role === "seller" || user.role === "merchant") {
        const shop = await storage.getShopByOwnerId(user.id);
        shopId = shop?.id || null;
      }

      // Map legacy role to new role system
      const newRole = mapLegacyRoleToNewRole(user.role, user.isAdmin);

      // Generate JWT tokens
      const tokenPayload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: newRole,
        shopId,
      };

      const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

      // Set refresh token as HTTP-only cookie (7 days)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Return access token and user data (for backward compatibility)
      const responseData = {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          role: newRole,
          isAdmin: user.isAdmin || newRole === Role.SUPER_ADMIN,
          shopId,
        },
      };
      
      // DEBUG: Log what we're sending to the client
      console.log("🔵 [LOGIN] Login successful for user:", user.username);
      console.log("🔵 [LOGIN] Original role:", user.role);
      console.log("🔵 [LOGIN] Mapped role:", newRole);
      console.log("🔵 [LOGIN] Is admin:", user.isAdmin || newRole === Role.SUPER_ADMIN);
      console.log("🔵 [LOGIN] Response data being sent:", JSON.stringify(responseData, null, 2));
      
      return res.json(responseData);
    } catch (e: any) {
      console.error("Login failed", e?.message);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // --- 1b. REGISTER ---
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { username, password, role = "customer" } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      if (password.length < 3) {
        return res.status(400).json({ message: "Password must be at least 3 characters" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Map to legacy role for DB storage
      const legacyRole = role === "admin" ? "admin" : role === "merchant" ? "seller" : "customer";
      const isAdmin = role === "admin";

      const hashed = hashPassword(password);
      const created = await storage.createUser({
        username,
        password: hashed,
        role: legacyRole,
        isAdmin,
        shopName: null,
        shopAddress: null,
        mapsLink: null,
      } as any);

      // Map to new role system
      const newRole = mapLegacyRoleToNewRole(legacyRole, isAdmin);

      return res.status(201).json({
        ...created,
        role: newRole,
      });
    } catch (e: any) {
      console.error("Register failed", e?.message);
      return res.status(400).json({ message: "Register failed: " + (e?.message || "Unknown error") });
    }
  });

  // --- 1c. REFRESH TOKEN ---
  app.post("/api/auth/refresh", refreshTokenLimiter, async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await storage.getUserByUsername(decoded.username);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get shop if merchant
      let shopId: number | null = null;
      if (user.role === "seller" || user.role === "merchant") {
        const shop = await storage.getShopByOwnerId(user.id);
        shopId = shop?.id || null;
      }

      // Map legacy role
      const newRole = mapLegacyRoleToNewRole(user.role, user.isAdmin);

      // Generate new token pair
      const tokenPayload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: newRole,
        shopId,
      };

      const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(tokenPayload);

      // Set new refresh token cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          role: newRole,
          isAdmin: user.isAdmin || newRole === Role.SUPER_ADMIN,
          shopId,
        },
      });
    } catch (e: any) {
      console.error("Refresh token failed", e?.message);
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
  });

  // --- 1d. LOGOUT ---
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ message: "Logged out successfully" });
  });

  // ============================================
  // PROTECTED ROUTES
  // ============================================

  // --- 0b. FETCH LOGGED-IN OWNER SHOP (Partner Dashboard) ---
  app.get("/api/shops/mine", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || {});
    } catch (e) {
      console.error("Failed to fetch my shop", e);
      return res.status(500).json({ message: "Failed to fetch shop" });
    }
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
        // For public marketplace, only show approved products with status "approved"
        // Filter out deleted and non-approved statuses
        rows = rows.filter((p: any) => {
          const status = (p?.status || "").toLowerCase();
          return status !== "deleted" && 
                 status !== "pending" && 
                 status !== "rejected" &&
                 (p?.approved === true);
        });
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

  // --- 2a. ADMIN/ALL PRODUCTS WITH FILTERS (requires SUPER_ADMIN) ---
  app.get("/api/products/all", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
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

  // --- 2b. FETCH SINGLE PRODUCT (Public - Only Approved) ---
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid product id" });
      }

      const product = await storage.getProductWithSeller(id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Only show approved products to public
      if (!product.approved || product.status !== "approved") {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.json(product);
    } catch (e) {
      console.error("Fetch product failed", e);
      return res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // ============================================
  // MERCHANT PRODUCT MANAGEMENT APIs
  // ============================================

  // --- MERCHANT: GET All Products ---
  app.get("/api/merchant/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const merchantId = req.userId!;
      const merchantProducts = await storage.getProductsByMerchant(merchantId);

      // Get images for each product
      const productsWithImages = await Promise.all(
        merchantProducts.map(async (product) => {
          const images = await storage.getProductImages(product.id);
          return {
            ...product,
            images: images.map((img) => img.url),
            imageUrl: product.imageUrl || (images[0]?.url || null),
          };
        })
      );

      return res.json({ data: productsWithImages });
    } catch (e: any) {
      console.error("Failed to fetch merchant products", e?.message);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // --- MERCHANT: CREATE Product ---
  app.post("/api/merchant/products", requireAuth, requireMerchant, upload.array("images"), async (req: Request, res: Response) => {
    try {
      const merchantId = req.userId!;
      const shop = await storage.getShopByOwnerId(merchantId);
      
      if (!shop) {
        return res.status(400).json({ message: "Shop not found. Please create a shop first." });
      }

      const { title, name, description, price, mrp, category, stock, imageUrls } = req.body;

      // Validation
      if (!title && !name) {
        return res.status(400).json({ message: "Product title/name is required" });
      }
      if (!price) {
        return res.status(400).json({ message: "Price is required" });
      }
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      if (parseFloat(price) < 0) {
        return res.status(400).json({ message: "Price must be >= 0" });
      }
      if (mrp && parseFloat(mrp) < 0) {
        return res.status(400).json({ message: "MRP must be >= 0" });
      }

      // Get uploaded images
      const files = (req as any).files as Express.Multer.File[] | undefined;
      const uploadedUrls = files
        ? files.map((f) => (f as any)?.path || (f as any)?.secure_url || "")
        : [];
      
      // Combine with imageUrls from body
      const allImageUrls = [
        ...uploadedUrls.filter(Boolean),
        ...(Array.isArray(imageUrls) ? imageUrls : typeof imageUrls === "string" ? [imageUrls] : []),
      ].filter(Boolean);

      // Create product
      const productData = insertProductSchema.parse({
        shopId: shop.id,
        sellerId: merchantId,
        name: title || name,
        title: title || name,
        price: String(price),
        mrp: mrp ? String(mrp) : null,
        category: String(category),
        description: description || null,
        imageUrl: allImageUrls[0] || null,
        stock: stock ? Number(stock) : 0,
        status: "pending",
        approved: false,
      });

      const newProduct = await storage.createProduct(productData);

      // Create product images
      for (const url of allImageUrls) {
        await storage.createProductImage({
          productId: newProduct.id,
          url: String(url),
        });
      }

      // Fetch created product with images
      const images = await storage.getProductImages(newProduct.id);
      
      return res.status(201).json({
        ...newProduct,
        images: images.map((img) => img.url),
      });
    } catch (e: any) {
      console.error("Create product failed", e?.message);
      if (e.errors) {
        return res.status(400).json({ message: "Validation failed", errors: e.errors });
      }
      return res.status(400).json({ message: e?.message || "Failed to create product" });
    }
  });

  // --- MERCHANT: UPDATE Product ---
  app.put("/api/merchant/products/:id", requireAuth, requireMerchant, upload.array("images"), async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const merchantId = req.userId!;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.sellerId !== merchantId) {
        return res.status(403).json({ message: "You can only update your own products" });
      }

      const { title, name, description, price, mrp, category, stock, imageUrls, removeImages } = req.body;

      // Get uploaded images
      const files = (req as any).files as Express.Multer.File[] | undefined;
      const uploadedUrls = files
        ? files.map((f) => (f as any)?.path || (f as any)?.secure_url || "")
        : [];

      // Combine image URLs
      const allImageUrls = [
        ...uploadedUrls.filter(Boolean),
        ...(Array.isArray(imageUrls) ? imageUrls : typeof imageUrls === "string" ? [imageUrls] : []),
      ].filter(Boolean);

      // Remove specified images
      if (Array.isArray(removeImages)) {
        for (const imageId of removeImages) {
          await storage.deleteProductImage(Number(imageId));
        }
      }

      // Update product
      const updateData: any = {};
      if (title || name) updateData.title = title || name;
      if (title || name) updateData.name = title || name;
      if (description !== undefined) updateData.description = description || null;
      if (price !== undefined) {
        if (parseFloat(price) < 0) {
          return res.status(400).json({ message: "Price must be >= 0" });
        }
        updateData.price = String(price);
      }
      if (mrp !== undefined) {
        if (mrp && parseFloat(mrp) < 0) {
          return res.status(400).json({ message: "MRP must be >= 0" });
        }
        updateData.mrp = mrp ? String(mrp) : null;
      }
      if (category !== undefined) updateData.category = String(category);
      if (stock !== undefined) updateData.stock = Number(stock);
      if (allImageUrls.length > 0) {
        updateData.imageUrl = allImageUrls[0];
      }

      // If product was approved, reset to pending after update
      if (existingProduct.status === "approved") {
        updateData.status = "pending";
        updateData.approved = false;
      }

      const updatedProduct = await storage.updateProduct(productId, updateData);

      // Add new images
      for (const url of allImageUrls) {
        await storage.createProductImage({
          productId: productId,
          url: String(url),
        });
      }

      // Fetch updated product with images
      const images = await storage.getProductImages(productId);
      
      return res.json({
        ...updatedProduct,
        images: images.map((img) => img.url),
      });
    } catch (e: any) {
      console.error("Update product failed", e?.message);
      return res.status(400).json({ message: e?.message || "Failed to update product" });
    }
  });

  // --- MERCHANT: DELETE Product ---
  app.delete("/api/merchant/products/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const merchantId = req.userId!;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.sellerId !== merchantId) {
        return res.status(403).json({ message: "You can only delete your own products" });
      }

      await storage.deleteProduct(productId);
      return res.json({ message: "Product deleted successfully" });
    } catch (e: any) {
      console.error("Delete product failed", e?.message);
      return res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // --- MERCHANT: UPDATE Stock ---
  app.patch("/api/merchant/products/:id/stock", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const merchantId = req.userId!;
      const { stock } = req.body;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      if (stock === undefined || stock === null) {
        return res.status(400).json({ message: "Stock value is required" });
      }
      if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({ message: "Stock must be a non-negative integer" });
      }

      // Check ownership
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.sellerId !== merchantId) {
        return res.status(403).json({ message: "You can only update your own products" });
      }

      const updatedProduct = await storage.updateProduct(productId, { stock: Number(stock) });
      return res.json(updatedProduct);
    } catch (e: any) {
      console.error("Update stock failed", e?.message);
      return res.status(400).json({ message: e?.message || "Failed to update stock" });
    }
  });

  // ============================================
  // ADMIN PRODUCT MODERATION APIs
  // ============================================

  // --- ADMIN: GET Pending Products ---
  app.get("/api/admin/products/pending", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const pendingProducts = await storage.getPendingProducts();
      
      // Get images for each product
      const productsWithImages = await Promise.all(
        pendingProducts.map(async (product) => {
          const images = await storage.getProductImages(product.id);
          return {
            ...product,
            images: images.map((img) => img.url),
          };
        })
      );

      return res.json({ data: productsWithImages });
    } catch (e: any) {
      console.error("Failed to fetch pending products", e?.message);
      return res.status(500).json({ message: "Failed to fetch pending products" });
    }
  });

  // --- ADMIN: APPROVE Product ---
  app.patch("/api/admin/products/:id/approve", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updatedProduct = await storage.updateProduct(productId, {
        status: "approved",
        approved: true,
      });

      // Get images
      const images = await storage.getProductImages(productId);

      return res.json({
        ...updatedProduct,
        images: images.map((img) => img.url),
      });
    } catch (e: any) {
      console.error("Approve product failed", e?.message);
      return res.status(500).json({ message: e?.message || "Failed to approve product" });
    }
  });

  // --- ADMIN: REJECT Product ---
  app.patch("/api/admin/products/:id/reject", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const { reason } = req.body;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updatedProduct = await storage.updateProduct(productId, {
        status: "rejected",
        approved: false,
      });

      // Get images
      const images = await storage.getProductImages(productId);

      console.log(`Product ${productId} rejected by admin. Reason: ${reason || "Not specified"}`);

      return res.json({
        ...updatedProduct,
        images: images.map((img) => img.url),
        rejectionReason: reason || null,
      });
    } catch (e: any) {
      console.error("Reject product failed", e?.message);
      return res.status(500).json({ message: e?.message || "Failed to reject product" });
    }
  });

  // --- 3. CREATE PRODUCT (Legacy - Requires MERCHANT or higher) ---
  app.post("/api/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      console.log("Adding Product Body:", req.body);
      const userId = req.userId!;
      const shopId = Number(req.body?.shopId) || req.user?.shopId || 1;
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

  // --- 4. IMAGE UPLOAD (Requires Auth) ---
  app.post("/api/upload", requireAuth, upload.array("images"), async (req: Request, res: Response) => {
    try {
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) return res.status(400).json({ message: "No files" });
      const urls = files.map((f) => (f as any)?.path || (f as any)?.secure_url || f.filename);
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

  app.post("/api/banners", requireAuth, requireSuperAdmin, upload.single("image"), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const image = file
        ? (file as any)?.path || (file as any)?.secure_url || ""
        : typeof req.body?.image === "string"
          ? req.body.image
          : "";
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

  app.patch("/api/banners/:id", requireAuth, requireSuperAdmin, upload.single("image"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = (await storage.getBanners()).find((b) => b.id === id);
      if (!existing) return res.status(404).json({ message: "Banner not found" });

      const file = (req as any).file as Express.Multer.File | undefined;
      const image = file
        ? (file as any)?.path || (file as any)?.secure_url || existing.image
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

  app.delete("/api/banners/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    await storage.deleteBanner(Number(req.params.id));
    res.json({ success: true });
  });

  // --- 6. OFFERS ---
  app.get("/api/offers", async (_req, res) => {
    const offers = await storage.getOffers();
    res.json(offers);
  });

  app.post("/api/offers", requireAuth, requireCityAdmin, async (req, res) => {
    const userId = req.userId!;
    const offer = await storage.createOffer({ ...req.body, userId, isActive: true });
    res.status(201).json(offer);
  });

  app.delete("/api/offers/:id", requireAuth, requireCityAdmin, async (req, res) => {
    await storage.deleteOffer(Number(req.params.id));
    res.json({ success: true });
  });

  // --- 6b. ORDERS ---
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const parsed = insertOrderSchema.parse({
        productId: Number(req.body?.productId),
        shopId: Number(req.body?.shopId) || 1,
        customerName: String(req.body?.customerName || "Customer"),
        customerPhone: String(req.body?.customerPhone || "0000000000"),
        customerAddress: String(req.body?.customerAddress || "Shahdol"),
        quantity: Number(req.body?.quantity) || 1,
        totalPrice: String(req.body?.totalPrice || "0"),
        status: req.body?.status || "pending",
      });
      const created = await storage.createOrder(parsed);

      // --- WhatsApp notification (placeholder) ---
      const whatsappNumber = process.env.WHATSAPP_ALERT_NUMBER || "YOUR_WHATSAPP_NUMBER";
      const message = `Naya Order! Customer: ${parsed.customerName}, Amount: ₹${parsed.totalPrice}, Status: ${parsed.status}`;
      // Replace this with real provider call; keeping safe log for now
      try {
        await fetch(process.env.WHATSAPP_WEBHOOK_URL || "", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: whatsappNumber, message }),
        });
      } catch (notifyErr) {
        console.log("WhatsApp notify (placeholder):", { to: whatsappNumber, message });
      }

      return res.status(201).json(created);
    } catch (e: any) {
      console.error("Order create failed", e?.message);
      return res.status(400).json({ message: e?.message || "Order create failed" });
    }
  });

  app.get("/api/orders", optionalAuth, async (req: Request, res: Response) => {
    try {
      const includeAll = String(req.query?.includeAll || "").toLowerCase() === "true";
      const phone = typeof req.query?.phone === "string" ? req.query.phone.trim() : "";
      
      // If includeAll=true, require SUPER_ADMIN
      if (includeAll) {
        if (!req.user || req.user.role !== Role.SUPER_ADMIN) {
          return res.status(403).json({ message: "Super admin access required" });
        }
      }
      
      if (!includeAll && !phone) {
        return res.status(400).json({ message: "Phone required" });
      }
      let rows = await db.select().from(orders);
      if (!includeAll) {
        rows = rows.filter((o: any) => (o.customerPhone || "").trim() === phone);
      }
      return res.json(rows);
    } catch (e: any) {
      console.error("Orders fetch failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/orders/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
      const nextStatus = typeof req.body?.status === "string" ? req.body.status : null;
      if (!nextStatus) return res.status(400).json({ message: "Status required" });
      const [updated] = await db.update(orders).set({ status: nextStatus }).where(eq(orders.id, id)).returning();
      return res.json(updated);
    } catch (e: any) {
      console.error("Order update failed", e?.message);
      return res.status(500).json({ message: "Update failed" });
    }
  });

  // --- REVIEWS ---
  app.post("/api/reviews", async (req: Request, res: Response) => {
    try {
      const parsed = insertReviewSchema.parse({
        ...req.body,
        isApproved: false,
      });
      const [created] = await db.insert(reviews).values(parsed as any).returning();
      return res.status(201).json(created);
    } catch (e: any) {
      console.error("Create review failed", e?.message);
      return res.status(400).json({ message: e?.message || "Review create failed" });
    }
  });

  app.get("/api/reviews/:productId", async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ message: "Invalid product id" });
      const rows = await db.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)));
      return res.json(rows);
    } catch (e: any) {
      console.error("Fetch reviews failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const onlyPending = String(req.query.pending || "").toLowerCase() === "true";
      const rows = onlyPending
        ? await db.select().from(reviews).where(eq(reviews.isApproved, false))
        : await db.select().from(reviews);
      return res.json(rows);
    } catch (e: any) {
      console.error("Fetch all reviews failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.patch("/api/reviews/:id/approve", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
      const [updated] = await db.update(reviews).set({ isApproved: true }).where(eq(reviews.id, id)).returning();
      return res.json(updated);
    } catch (e: any) {
      console.error("Approve review failed", e?.message);
      return res.status(500).json({ message: "Approve failed" });
    }
  });

  app.delete("/api/reviews/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });
      await db.delete(reviews).where(eq(reviews.id, id));
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Delete review failed", e?.message);
      return res.status(500).json({ message: "Delete failed" });
    }
  });

  // --- 7. PARTNER SHOP ROUTES (Protected) ---
  app.get("/api/partner/shop", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const shop = await storage.getShopByOwnerId(userId);
      return res.json(shop || null);
    } catch (e) {
      console.error("Fetch partner shop failed", e);
      return res.status(500).json({ message: "Failed to fetch shop" });
    }
  });

  app.get("/api/partner/shop/:ownerId", optionalAuth, async (req: Request, res: Response) => {
    try {
      const ownerId = Number(req.params.ownerId);
      if (!Number.isInteger(ownerId)) return res.json(null);
      const shop = await storage.getShopByOwnerId(ownerId);
      return res.json(shop || null);
    } catch (e) {
      return res.json(null);
    }
  });

  app.post("/api/partner/shop/create-default", requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;

      const existingShop = await storage.getShopByOwnerId(userId);
      if (existingShop) {
        // Update role to seller if not already
        if (req.user?.role !== Role.MERCHANT) {
          await storage.updateUser(userId, { role: "seller" });
        }
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
      
      // Update user role to seller (merchant)
      await storage.updateUser(userId, { role: "seller" });

      console.log(`✅ [SHOP LIVE] Created for User: ${userId}`);
      return res.status(201).json(newShop);
    } catch (e: any) {
      console.error("❌ Shop Create Error:", e);
      return res.status(400).json({ message: "Check details: Address and Mobile are required" });
    }
  });

  app.patch("/api/products/:id", requireAuth, requireMerchant, upload.single("image"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ message: "Product not found" });

      // Check if user owns this product (unless SUPER_ADMIN)
      if (req.user?.role !== Role.SUPER_ADMIN && existing.sellerId !== req.userId) {
        return res.status(403).json({ message: "You can only update your own products" });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      const uploadedUrl = file ? (file as any)?.path || (file as any)?.secure_url : undefined;
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

  app.patch("/api/products/:id/approve", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
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
  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;

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

  app.post("/api/categories", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
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

  app.patch("/api/categories/:id", requireAuth, requireSuperAdmin, upload.single("image"), async (req: Request, res: Response) => {
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
          ? (file as any)?.path || (file as any)?.secure_url || null
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

  app.delete("/api/categories/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
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