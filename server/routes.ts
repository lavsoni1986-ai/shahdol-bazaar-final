import express, { type Express, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { type Server } from "http";
import { storage, prisma, checkDatabaseConnection } from "./storage.js";
import { z } from "zod";
import { LoginSchema, RegisterSchema } from "./validation/schemas.js";
import { insertProductSchema, insertOrderSchema, insertReviewSchema, insertShopSchema, insertCategorySchema } from "../shared/schema";
import { hashPassword, verifyPassword } from "./auth/password.js";
import { generateTokenPair, verifyRefreshToken, JWTPayload } from "./auth/jwt.js";
import { requireAuth, requireRole, optionalAuth, Role, mapLegacyRoleToNewRole, requireMerchant, requireSuperAdmin, requireCityAdmin } from "./auth/middleware.js";
import { loginLimiter, refreshTokenLimiter, mutationLimiter } from "./auth/rateLimiter.js";
import { Groq } from "groq-sdk";

// ============================================
// SECURITY: Groq SDK Safety Shield
// ============================================
// Lazy Getter pattern: Only instantiates Groq when actually needed
// Returns a Proxy that throws descriptive errors if API key is missing
// This prevents server crash on startup when GROQ_API_KEY is not set
let groqInstance: Groq | null = null;
let groqErrorLogged = false;

const getGroq = (): Groq | null => {
  if (groqInstance) return groqInstance;
  
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    // Log warning only once to avoid spamming
    if (!groqErrorLogged) {
      console.warn("⚠️ [GROQ] GROQ_API_KEY not set - AI features will be disabled");
      groqErrorLogged = true;
    }
    return null;
  }
  
  try {
    groqInstance = new Groq({ apiKey });
    console.log("✅ [GROQ] SDK initialized successfully");
    return groqInstance;
  } catch (error) {
    console.error("❌ [GROQ] Failed to initialize SDK:", error);
    return null;
  }
};

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
  
  // 🚩 SUPER_ADMIN helper function - STRICT check for SUPER_ADMIN role only
  const isSuperAdmin = (user: any) => 
    user?.role === 'SUPER_ADMIN';
  
  // --- HEALTH CHECK ---
  app.get("/api/health", async (_req, res) => {
    try {
      // Use Prisma instead of Drizzle
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Health check failed:", err?.message);
      return res.status(500).json({ status: "error", message: "DB unavailable" });
    }
  });

  // --- LEAD TRACKING ---
  app.post("/api/leads", async (req: Request, res: Response) => {
    try {
      const { source, action, itemId, itemName, category, searchTerm, metadata, productId, vendorId, districtId } = req.body;
      const userId = req.userId || null;
      
      // Create lead record in database
      const lead = await prisma.lead.create({
        data: {
          source: source || "WHATSAPP_INQUIRY",
          action: action || "click",
          itemId: itemId ? String(itemId) : productId ? String(productId) : null,
          itemName: itemName || null,
          category: category || null,
          searchTerm: searchTerm || null,
          metadata: metadata || { productId, vendorId, districtId, userId },
        }
      });
      
      return res.json({ success: true, leadId: lead.id });
    } catch (err: any) {
      console.error("Lead tracking error:", err?.message);
      return res.json({ success: false, message: "Lead recorded locally only" });
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

  // --- 0. LEGACY LOGIN REDIRECT (301) ---
  // Legacy mobile bookmarks may still use /api/login
  // Redirect to new /api/auth/login endpoint
  app.post("/api/login", (_req: Request, res: Response) => {
    return res.redirect(301, "/api/auth/login");
  });

  // --- 1. LOGIN (JWT-based) ---
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      // ✅ SECURITY: Validate request body with Zod
      const validation = LoginSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: {
            username: errors.username?.[0],
            password: errors.password?.[0]
          }
        });
      }
      
      const { username: rawUsername, password } = validation.data;
      const username = rawUsername.toLowerCase().trim();

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
        isAdmin: user.isAdmin || newRole === Role.SUPER_ADMIN,
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

      // Also set accessToken as HTTP-only cookie (15 mins) for extra security
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
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
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // ✅ SECURITY: Validate request body with Zod (strong password policy)
      const validation = RegisterSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: {
            username: errors.username?.[0],
            password: errors.password?.[0],
            role: errors.role?.[0]
          }
        });
      }
      
      const { username: rawUsername, password, role = "customer", districtId } = validation.data;
      const username = rawUsername.toLowerCase().trim();

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Map to legacy role for DB storage
      // Note: SUPER_ADMIN is not allowed in registration - it's only assignable via admin tools
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
        districtId,
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
        isAdmin: user.isAdmin || user.role === 'SUPER_ADMIN' || newRole === Role.SUPER_ADMIN,
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

      // Also set accessToken as HTTP-only cookie (15 mins) for extra security
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/',
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          role: newRole,
          isAdmin: user.isAdmin || user.role === 'SUPER_ADMIN' || newRole === Role.SUPER_ADMIN,
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

  // --- 1e. VERIFY TOKEN ---
  app.get("/api/auth/verify", optionalAuth, async (req: Request, res: Response) => {
    try {
      if (!req.userId) {
        return res.json({ authenticated: false, user: null });
      }
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.json({ authenticated: false, user: null });
      }
      return res.json({ 
        authenticated: true, 
        user: {
          id: user.id,
          username: user.username,
          role: mapLegacyRoleToNewRole(user.role, user.isAdmin),
          isAdmin: user.isAdmin
        }
      });
    } catch (e) {
      console.error("Verify error:", e);
      return res.status(500).json({ message: "Verify failed" });
    }
  });

  // ============================================
  // MARKETPLACE ROUTES (Public) - MUST be before district routes
  // ============================================

  // --- FETCH STORES BY DISTRICT ---
  app.get("/api/marketplace/stores", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      
      // Get districtId from query parameter
      const districtIdParam = typeof req.query?.districtId === "string" 
        ? req.query.districtId 
        : null;
      
      const districtId = districtIdParam ? parseInt(districtIdParam, 10) : req.districtId;
      
      // Use default districtId (2 = Shahdol) if not provided
      const effectiveDistrictId = districtId || 3;
      
      const stores = await storage.getStoresByDistrict(effectiveDistrictId);
      
      return res.json({
        data: stores,
        count: stores.length
      });
    } catch (e) {
      console.error("Marketplace stores fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  // --- FETCH STORE BY SLUG ---
  app.get("/api/marketplace/stores/:slug", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug as string;
      console.log(`[MARKETPLACE] Fetching store details for slug: ${slug}`);
      
      const store = await storage.getVendorBySlug(slug);
      
      if (!store) {
        console.log(`[MARKETPLACE] Store NOT FOUND in Vendor table: ${slug}`);
        return res.status(404).json({ message: "Store not found" });
      }
      
      return res.json(store);
    } catch (e) {
      console.error(`[MARKETPLACE] Error fetching store ${req.params.slug}:`, e);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- FETCH PRODUCTS BY DISTRICT ---
  app.get("/api/marketplace/products", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      
      // Get districtId from query parameter or use resolved district
      const districtIdParam = typeof req.query?.districtId === "string" 
        ? req.query.districtId 
        : null;
      
      const districtId = districtIdParam ? parseInt(districtIdParam, 10) : req.districtId;
      
      // Use default districtId (2 = Shahdol) if not provided
      const effectiveDistrictId = districtId || 3;
      
      // Get approved products filtered by district
      const products = await storage.getAllProductsWithSeller(true, null, effectiveDistrictId);
      
      // Map product fields to frontend expected format
      const mappedProducts = products.map((product: any) => ({
        id: product.id,
        name: product.title || "Untitled",
        title: product.title,
        price: product.price?.toString() || "0",
        mrp: product.mrp?.toString() || null,
        imageUrl: product.imageUrl || null,
        category: product.categoryName || null,
        shopName: product.vendor?.name || null,
        stock: product.stock || 0,
        isTrending: product.isTrending || false,
      }));
      
      return res.json({
        data: mappedProducts,
        count: mappedProducts.length
      });
    } catch (e) {
      console.error("Marketplace products fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // ============================================
  // DISTRICT ROUTES
  // ============================================

  // --- GET DISTRICT BY SLUG ---
  app.get("/api/districts/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      const district = await storage.getDistrictBySlug(slug);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      return res.json(district);
    } catch (e) {
      console.error("District fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch district" });
    }
  });

  // --- GET DISTRICT BY ID ---
  app.get("/api/districts/id/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const district = await storage.getDistrict(id);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      return res.json(district);
    } catch (e) {
      console.error("District fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch district" });
    }
  });

  // --- GET PUBLIC DISTRICT STATS (for homepage) ---
  app.get("/api/district-stats", async (req: Request, res: Response) => {
    try {
      const districtIdParam = req.query.districtId as string;
      const districtId = districtIdParam ? parseInt(districtIdParam, 10) : 2;
      
      // Get real counts from database
      const vendorCount = await storage.getVendorCountByDistrict(districtId);
      const productCount = await storage.getProductCountByDistrict(districtId);
      
      // For hospitals, count from the hospitals table
      const hospitalCount = await prisma.hospital.count({
        where: { districtId }
      });
      
      return res.json({
        vendorCount: vendorCount || 0,
        productCount: productCount || 0,
        hospitalCount: hospitalCount || 0
      });
    } catch (e) {
      console.error("District stats fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // --- GET ALL DISTRICTS (Public - for district switcher) ---
  app.get("/api/districts", async (req: Request, res: Response) => {
    try {
      const districts = await storage.getAllDistricts();
      return res.json({ success: true, data: districts });
    } catch (e) {
      console.error("Districts fetch error:", e);
      return res.status(500).json({ success: false, message: "Failed to fetch districts" });
    }
  });

  // --- FETCH VENDORS BY DISTRICT ---
  app.get("/api/vendors", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : null;
      const districtIdQuery = typeof req.query?.districtId === "string" ? parseInt(req.query.districtId) : null;
      const limit = Number(req.query?.limit) || 10;
      const businessType = typeof req.query?.businessType === "string" ? req.query.businessType : null;
      
      // Get districtId from slug or direct parameter
      let districtId: number | undefined;
      if (districtSlug) {
        const d = await storage.getDistrictBySlug(districtSlug);
        districtId = d?.id;
      } else if (districtIdQuery) {
        districtId = districtIdQuery;
      }
      
      // Build where clause
      const where: any = {};
      if (districtId) where.districtId = districtId;
      if (businessType) where.businessType = businessType;
      
      const vendors = await prisma.vendor.findMany({
        where,
        take: limit,
        orderBy: { id: 'desc' }
      });
      
      const total = await prisma.vendor.count({ where });
      
      return res.json({
        data: vendors,
        pagination: { total, limit, page: 1 }
      });
    } catch (e) {
      console.error("Vendors fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // --- CREATE VENDOR (Admin/Service Worker Registration) ---
  app.post("/api/vendors", requireAuth, requireCityAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        name, 
        slug, 
        description, 
        address, 
        phone, 
        mobile, 
        businessType, 
        category,
        experience,
        serviceArea,
        serviceHours,
        isProfessional,
        isTrending,
        districtId
      } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }

      // Generate slug from name if not provided
      const vendorSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const vendor = await storage.createVendor({
        name,
        slug: vendorSlug,
        description: description || "",
        address,
        phone,
        mobile,
        businessType: businessType || "SERVICE",
        category,
        experience: experience || 0,
        serviceArea,
        serviceHours,
        isProfessional: isProfessional || false,
        isTrending: isTrending || false,
        status: "APPROVED",
        districtId: districtId || req.user?.districtId || 3, // Default to Shahdol (ID: 3)
        images: [],
        specialties: [],
        safetyBadges: []
      });

      return res.status(201).json(vendor);
    } catch (e) {
      console.error("Vendor creation error:", e);
      return res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  // --- AI-POWERED MERCHANT ONBOARDING: Analyze Shop Photo ---
  // Uses Groq Vision to analyze shop image and extract merchant details
  const uploadSingle = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  app.post("/api/ai/onboard-vision", requireAuth, mutationLimiter, uploadSingle.single("image"), async (req: Request, res: Response) => {
    try {
      // Get district from header or query
      const districtSlug = req.headers['x-district-slug'] as string || req.query.district as string || 'shahdol';
      const district = await storage.getDistrictBySlug(districtSlug);
      const districtId = district?.id || 3; // Default to Shahdol (ID: 3)

      // Get uploaded image URL
      const file = (req as any).file as Express.Multer.File | undefined;
      const imageUrl = file ? (file as any)?.path || (file as any)?.secure_url : null;

      if (!imageUrl) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Initialize Groq
      const groq = getGroq();

      if (!groq) {
        return res.status(503).json({ message: "AI service unavailable - GROQ_API_KEY not configured" });
      }

      // Create base64 from image URL (Groq Vision expects base64)
      // For cloudinary URLs, we pass the URL directly to Groq Vision
      const imageForVision = imageUrl;

      // Call Groq Vision to analyze the shop photo
      const visionPrompt = `You are an AI assistant for Shahdol Bazaar, a local marketplace in Madhya Pradesh, India.
Analyze this shop/business photo and extract the following information:
1. Business name (if visible on signboard)
2. Business type (RETAIL, SERVICE, or WHOLESALE)
3. Category (Grocery, Electronics, Fashion, Restaurant, Hotel, Medical, Repair, etc.)
4. Address (if visible on signboard or can be inferred)
5. List of products visible in the shop

Respond ONLY with a JSON object in this exact format:
{
  "name": "string (or null if not visible)",
  "businessType": "RETAIL | SERVICE | WHOLESALE",
  "category": "string (main category)",
  "address": "string (or null if not visible)",
  "detectedProducts": ["product1", "product2", ...]
}

If you cannot determine any field, use null. Do not add any explanation.`;

      const visionResponse = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: visionPrompt },
              { type: "image_url", image_url: { url: imageForVision } }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      });

      const aiContent = visionResponse.choices[0]?.message?.content || "";
      
      // Parse JSON from response
      let parsedResult;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", aiContent);
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      // Return the analysis result with district info
      return res.json({
        success: true,
        districtId,
        districtSlug,
        imageUrl,
        analysis: {
          name: parsedResult.name || null,
          businessType: parsedResult.businessType || "RETAIL",
          category: parsedResult.category || null,
          address: parsedResult.address || null,
          detectedProducts: parsedResult.detectedProducts || []
        }
      });

    } catch (e: any) {
      console.error("AI onboard vision error:", e);
      return res.status(500).json({ 
        message: "Failed to analyze image",
        error: e.message 
      });
    }
  });

  // --- FETCH HOSPITALS BY DISTRICT ---
  app.get("/api/hospitals", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : null;
      const limit = Number(req.query?.limit) || 20;
      
      // Get districtId from slug
      let districtId: number | undefined;
      if (districtSlug) {
        const district = await storage.getDistrictBySlug(districtSlug);
        districtId = district?.id;
      }
      
      const where: any = {};
      if (districtId) {
        where.districtId = districtId;
      }
      
      const [hospitals, total] = await Promise.all([
        prisma.hospital.findMany({
          where,
          take: limit,
          orderBy: { name: 'asc' }
        }),
        prisma.hospital.count({ where })
      ]);
      
      return res.json({
        data: hospitals,
        pagination: { total, limit, page: 1 }
      });
    } catch (e) {
      console.error("Hospitals fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  // --- FETCH SCHOOLS BY DISTRICT ---
  app.get("/api/schools", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : null;
      const limit = Number(req.query?.limit) || 20;
      
      // Get districtId from slug
      let districtId: number | undefined;
      if (districtSlug) {
        const district = await storage.getDistrictBySlug(districtSlug);
        districtId = district?.id;
      }
      
      const where: any = {};
      if (districtId) {
        where.districtId = districtId;
      }
      where.businessType = 'SCHOOL';
      
      const [schools, total] = await Promise.all([
        prisma.vendor.findMany({
          where,
          take: limit,
          orderBy: { name: 'asc' }
        }),
        prisma.vendor.count({ where })
      ]);

      return res.json({
        data: schools,
        pagination: { total, limit, page: 1 }
      });
    } catch (e) {
      console.error("Schools fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // --- FETCH SERVICE WORKERS BY DISTRICT ---
  app.get("/api/service-workers", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : null;
      const limit = Number(req.query?.limit) || 20;
      
      // Get districtId from slug
      let districtId: number | undefined;
      if (districtSlug) {
        const district = await storage.getDistrictBySlug(districtSlug);
        districtId = district?.id;
      }
      
      const where: any = {};
      if (districtId) {
        where.districtId = districtId;
      }
      
      const [serviceWorkers, total] = await Promise.all([
        prisma.serviceWorker.findMany({
          where,
          take: limit,
          orderBy: { name: 'asc' }
        }),
        prisma.serviceWorker.count({ where })
      ]);

      return res.json({
        data: serviceWorkers,
        pagination: { total, limit, page: 1 }
      });
    } catch (e) {
      console.error("Service Workers fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch service workers" });
    }
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
        vendorId: merchantId,
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
      if (existingProduct.vendorId !== merchantId) {
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
      if (existingProduct.vendorId !== merchantId) {
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
      if (existingProduct.vendorId !== merchantId) {
        return res.status(403).json({ message: "You can only update your own products" });
      }

      const updatedProduct = await storage.updateProduct(productId, { stock: Number(stock) });
      return res.json(updatedProduct);
    } catch (e: any) {
      console.error("Update stock failed", e?.message);
      return res.status(400).json({ message: e?.message || "Failed to update stock" });
    }
  });

  // --- MERCHANT: AI Scan Inventory from Bill/Receipt ---
  app.post("/api/merchant/scan-inventory", requireAuth, requireMerchant, mutationLimiter, uploadSingle.single("image"), async (req: Request, res: Response) => {
    try {
      const merchantId = req.userId!;
      
      // Get merchant's shop/vendor
      const vendor = await storage.getShopByOwnerId(merchantId);
      if (!vendor) {
        return res.status(404).json({ message: "No shop found. Please set up your shop first." });
      }
      
      const vendorId = vendor.id;
      
      // Get uploaded image
      const file = (req as any).file as Express.Multer.File | undefined;
      const imageUrl = file ? (file as any)?.path || (file as any)?.secure_url : null;

      if (!imageUrl) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Initialize Groq Vision
      const groq = getGroq();

      if (!groq) {
        return res.status(503).json({ message: "AI service unavailable - GROQ_API_KEY not configured" });
      }

      // Use Groq Vision to extract inventory items from bill/receipt
      const visionPrompt = `You are an AI inventory scanner for Shahdol Bazaar marketplace. Analyze this image of a bill, receipt, or stock list. Extract ALL items visible. For each item provide: item_name, quantity, price, category. Return JSON array.`;

      const visionResponse = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [{ role: "user", content: [{ type: "text", text: visionPrompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
        temperature: 0.2,
        max_tokens: 1024,
      });

      const aiContent = visionResponse.choices[0]?.message?.content || "";
      
      let extractedItems;
      try {
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        extractedItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        extractedItems = [];
      }

      if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
        return res.status(400).json({ message: "No items could be extracted from the image", itemsFound: 0 });
      }

      // Get or create category helper
      const getOrCreateCategory = async (catName: string) => {
        let category = await prisma.category.findFirst({ where: { name: { contains: catName, mode: 'insensitive' } } });
        if (!category) {
          const slug = catName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
          category = await prisma.category.create({ data: { name: catName, slug } });
        }
        return category;
      };

      const results = { created: 0, updated: 0, products: [] as any[] };

      for (const item of extractedItems) {
        const itemName = item.item_name?.trim();
        if (!itemName) continue;

        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const categoryName = item.category || "General";

        const existingProduct = await prisma.product.findFirst({ where: { vendorId, title: { contains: itemName, mode: 'insensitive' } } });

        if (existingProduct) {
          const category = await getOrCreateCategory(categoryName);
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: { stock: existingProduct.stock + quantity, price: price > 0 ? price : existingProduct.price, categoryId: category.id }
          });
          results.updated++;
          results.products.push({ ...existingProduct, action: 'updated' });
        } else {
          const category = await getOrCreateCategory(categoryName);
          const newProduct = await prisma.product.create({
            data: { title: itemName, price: price || 0, mrp: price || 0, stock: quantity, approved: true, vendorId, categoryId: category.id, description: "Added via AI scan" }
          });
          results.created++;
          results.products.push({ ...newProduct, action: 'created' });
        }
      }

      return res.json({ success: true, message: `AI Munim processed ${extractedItems.length} items: ${results.created} created, ${results.updated} updated`, itemsFound: extractedItems.length, results });

    } catch (e: any) {
      console.error("AI scan inventory error:", e);
      return res.status(500).json({ message: "Failed to scan inventory", error: e.message });
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

  // ============================================================
  // 🔴 STRIKE 219: MASTER BACKEND WIRING & ERROR HANDLING
  // ============================================================

  // 🛠️ FIX 4: DB CONNECTION GUARD (Middleware)
  const requireDatabase = async (req: Request, res: Response, next: Function) => {
    const isDbConnected = await checkDatabaseConnection();
    if (!isDbConnected) {
      console.error("🚨 [DB GUARD] Database connection lost!");
      return res.status(503).json({ success: false, message: "Service Unavailable: Database Connection Lost" });
    }
    next();
  };

  // 🛠️ FIX 1 & 2: VENDOR APPROVE & DELETE APIs (Admin Only)
  app.patch("/api/admin/shops/:id/approve", requireAuth, requireSuperAdmin, requireDatabase, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid ID" });

      const existing = await storage.getShop(id);
      if (!existing) return res.status(404).json({ success: false, message: "Vendor not found" });

      const updated = await storage.updateShop(id, { approved: true, isVerified: true });
      return res.json({ success: true, data: updated });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Approve Vendor:", e?.message);
      return res.status(500).json({ success: false, message: "Internal Server Error during approval" });
    }
  });

  app.delete("/api/shops/:id", requireAuth, requireSuperAdmin, requireDatabase, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid ID" });

      const existing = await storage.getShop(id);
      if (!existing) return res.status(404).json({ success: false, message: "Vendor not found" });

      await storage.deleteShop(id);
      return res.json({ success: true, message: "Vendor permanently deleted" });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Delete Vendor:", e?.message);
      return res.status(500).json({ success: false, message: "Deletion failed" });
    }
  });

  // 🛠️ FIX 1 & 2: PRODUCT APPROVE & DELETE APIs (Admin Only)
  app.patch("/api/admin/products/:id/approve", requireAuth, requireSuperAdmin, requireDatabase, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid ID" });

      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ success: false, message: "Product not found" });

      const updated = await storage.updateProduct(id, { approved: true, status: "approved" });
      
      // 🛠️ FIX 3: STANDARDIZE 'name' vs 'title' ON RETURN
      const productName = (updated as any).name || (updated as any).title || "Unknown Product";
      return res.json({ 
        success: true, 
        data: { ...updated, name: productName } 
      });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Approve Product:", e?.message);
      return res.status(500).json({ success: false, message: "Failed to approve product" });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireSuperAdmin, requireDatabase, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid ID" });

      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ success: false, message: "Product not found" });

      await storage.deleteProduct(id);
      return res.json({ success: true, message: "Product permanently deleted" });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Delete Product:", e?.message);
      return res.status(500).json({ success: false, message: "Deletion failed" });
    }
  });

  // 🛠️ FIX 4: ORDERS API WITH `includeAll` LOGIC
  app.get("/api/orders", optionalAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      const includeAll = String(req.query?.includeAll || "").toLowerCase() === "true";
      const phone = typeof req.query?.phone === "string" ? req.query.phone.trim() : "";
      const userRole = (req.user as any)?.role || "CUSTOMER";
      const isSuper = userRole === "SUPER_ADMIN" || userRole === "admin";
      
      // If Admin requests all orders, fetch everything
      if (includeAll && isSuper) {
        const rows = await storage.getAllOrders(undefined);
        return res.json(rows);
      }

      if (!includeAll && !phone) {
        return res.status(400).json({ message: "Phone required" });
      }
      
      const rows = await storage.getAllOrders(includeAll ? undefined : phone);
      return res.json(rows);
    } catch (e: any) {
      console.error("🚨 [API ERROR] Fetch Orders:", e?.message);
      return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
  });

  // ============================================================
  // 🔴 MEGA STRIKE 221: PARTNER / VENDOR APIs
  // ============================================================

  // 1. Get Vendor's Own Products
  app.get("/api/vendor/products", requireAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const products = await prisma.product.findMany({
        where: { vendorId: userId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(products);
    } catch (e: any) {
      console.error("🚨 [API ERROR] Fetch Vendor Products:", e?.message);
      return res.status(500).json({ success: false, message: "Failed to load products" });
    }
  });

  // 2. Add New Product (Vendor)
  app.post("/api/vendor/products", requireAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { name, price, category, description, imageUrl } = req.body;

      if (!name || !price) {
        return res.status(400).json({ success: false, message: "Name and Price are required" });
      }

      const newProduct = await prisma.product.create({
        data: {
          title: name,
          price: Number(price),
          categoryName: category || "General",
          description: description || "",
          imageUrl: imageUrl || "",
          vendorId: userId,
          approved: false,
          status: "PENDING"
        }
      });

      return res.json({ success: true, data: newProduct, message: "Product added! Pending Admin Approval." });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Add Vendor Product:", e?.message);
      return res.status(500).json({ success: false, message: "Failed to add product" });
    }
  });

  // 3. Delete Vendor's Own Product
  app.delete("/api/vendor/products/:id", requireAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const productId = Number(req.params.id);

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      
      if (product.vendorId !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized to delete this product" });
      }

      await prisma.product.delete({ where: { id: productId } });
      return res.json({ success: true, message: "Product removed successfully" });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Delete Vendor Product:", e?.message);
      return res.status(500).json({ success: false, message: "Deletion failed" });
    }
  });

  // 4. Update Store Settings
  app.patch("/api/vendor/update", requireAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { shopName, phone, address } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          shopName: shopName || undefined,
          shopAddress: address || undefined,
        }
      });

      return res.json({ success: true, message: "Store settings updated!", data: updatedUser });
    } catch (e: any) {
      console.error("🚨 [API ERROR] Update Vendor Settings:", e?.message);
      return res.status(500).json({ success: false, message: "Failed to update settings" });
    }
  });

  // 5. Get Vendor's Live Orders
  app.get("/api/vendor/orders", requireAuth, requireDatabase, async (req: Request, res: Response) => {
    try {
      return res.json([]); 
    } catch (e: any) {
      return res.status(500).json({ success: false, message: "Failed to load orders" });
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

  // --- 3b. AI VISION - Analyze Product Image ---
  app.post("/api/ai/vision", mutationLimiter, async (req: Request, res: Response) => {
    try {
      const { imageUrl, base64 } = req.body;
      
      if (!imageUrl && !base64) {
        return res.status(400).json({ message: "Image URL or base64 required" });
      }
      
      // AI Vision Processing - Placeholder for real AI integration
      // In production, this would call OpenAI Vision, Google Cloud Vision, or similar
      // For now, we provide intelligent defaults based on common product patterns
      
      const mockAnalysis = {
        suggestedName: "",
        suggestedCategory: "",
        suggestedDescription: "",
        confidence: 0.85,
        tags: [] as string[],
        colors: [] as string[]
      };
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If base64 image provided, analyze it
      if (base64) {
        // Simple heuristic-based analysis (placeholder for real AI)
        // In production, call actual vision API
        mockAnalysis.suggestedName = "AI Detected Product";
        mockAnalysis.suggestedCategory = "general";
        mockAnalysis.suggestedDescription = "Product automatically detected from image. Please verify details.";
        mockAnalysis.tags = ["product", "detected"];
      }
      
      return res.json({
        success: true,
        analysis: mockAnalysis,
        message: "AI vision processing complete"
      });
    } catch (e) {
      console.error("AI Vision error:", e);
      return res.status(500).json({ message: "AI vision processing failed" });
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
  app.get("/api/offers", async (req, res) => {
    // Universal fallback: Ensure districtId is always defined (default to Shahdol = 2)
    const districtId = req.districtId ?? 2;
    const offers = await storage.getOffers(districtId);
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
  app.post("/api/orders", mutationLimiter, async (req: Request, res: Response) => {
    try {
      // Handle both single order and bulk orders (array)
      const orderData = req.body?.items ? req.body.items : [req.body];
      
      if (!Array.isArray(orderData) || orderData.length === 0) {
        return res.status(400).json({ message: "No order data provided" });
      }

      // Process each order item
      const createdOrders = [];
      
      for (const orderItem of orderData) {
        // Ensure productId is always a valid number
        const productId = Number(orderItem?.productId);
        if (!Number.isInteger(productId) || productId <= 0) {
          console.warn("⚠️ Invalid productId, skipping order item:", orderItem?.productId);
          continue; // Skip invalid order items
        }
        
        const parsed = insertOrderSchema.parse({
          productId: productId,
          shopId: Number(orderItem?.shopId) || 1,
          vendorId: Number(orderItem?.vendorId) || undefined,
          customerName: String(orderItem?.customerName || "Customer"),
          customerPhone: String(orderItem?.customerPhone || "0000000000"),
          customerAddress: String(orderItem?.customerAddress || "Shahdol"),
          quantity: Number(orderItem?.quantity) || 1,
          totalPrice: String(orderItem?.totalPrice || "0"),
          status: orderItem?.status || "pending",
          districtId: orderItem?.districtId || 3,
          paymentMethod: orderItem?.paymentMethod,
        });
        
        const created = await storage.createOrder(parsed);
        createdOrders.push(created);

        // ============================================================
        // 🔔 WHATSAPP ALERT STRIKE SYSTEM
        // ============================================================
        
        // Fetch Product and Vendor Details
        const product = await storage.getProduct(parsed.productId);
        const vendor = product ? await storage.getVendor(product.vendorId) : null;
        
        const productName = (product as any)?.title || "Unknown Product";
        const vendorPhone = vendor?.phone || vendor?.mobile || null;
        const masterAdminNumber = process.env.WHATSAPP_ALERT_NUMBER || null;
        const targetWhatsAppNumber = vendorPhone || masterAdminNumber;
        
        const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://shahdolbazaar.com";
        const acceptanceLink = `${frontendUrl}/vendor/dashboard?orderId=${created.id}`;
        
        const whatsappMessage = `📦 Naya Order (BharatOS)! \n\n` +
          `Customer: ${parsed.customerName} \n` +
          `Items: ${productName} x ${parsed.quantity} \n` +
          `Total Amount: ₹${parsed.totalPrice} \n` +
          `Address: ${parsed.customerAddress} \n\n` +
          `✅ Accept Order here: ${acceptanceLink}`;

        const whatsappWebhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
        
        if (targetWhatsAppNumber && whatsappWebhookUrl) {
          try {
            await fetch(whatsappWebhookUrl, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.WHATSAPP_API_KEY || ""}`
              },
              body: JSON.stringify({ 
                to: targetWhatsAppNumber, 
                message: whatsappMessage,
                type: "order_alert",
                metadata: {
                  orderId: created.id,
                  vendorId: vendor?.id || null,
                  vendorName: vendor?.name || "Unknown Vendor",
                  productId: parsed.productId,
                  customerName: parsed.customerName,
                  customerPhone: parsed.customerPhone,
                  timestamp: new Date().toISOString()
                }
              })
            });
            console.log("📱 WhatsApp Alert:", { to: targetWhatsAppNumber, orderId: created.id });
          } catch (webhookErr) {
            console.error("⚠️ WhatsApp Alert Failed:", webhookErr instanceof Error ? webhookErr.message : "Unknown error");
          }
        }
      } // End of for loop

      // Return the orders created
      const firstOrder = createdOrders[0];
      return res.status(201).json({ 
        ...firstOrder, 
        orderId: firstOrder?.id,
        multipleOrders: createdOrders.length > 1 ? createdOrders : undefined 
      });
    } catch (e: any) {
      console.error("Order create failed", e?.message);
      return res.status(400).json({ message: e?.message || "Order create failed" });
    }
  });

  app.get("/api/orders", optionalAuth, async (req: Request, res: Response) => {
    try {
      const includeAll = String(req.query?.includeAll || "").toLowerCase() === "true";
      const phone = typeof req.query?.phone === "string" ? req.query.phone.trim() : "";
      
      // If includeAll=true, require SUPER_ADMIN or admin
      if (includeAll) {
        if (!req.user || (!req.user.isAdmin && req.user.role !== 'SUPER_ADMIN')) {
          return res.status(403).json({ message: "Super admin access required" });
        }
      }
      
      if (!includeAll && !phone) {
        return res.status(400).json({ message: "Phone required" });
      }
      
      // Use Prisma-based storage instead of Drizzle
      const rows = await storage.getAllOrders(includeAll ? undefined : phone);
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
      
      // Use Prisma-based storage instead of Drizzle
      const updated = await storage.updateOrderStatus(id, nextStatus);
      return res.json(updated);
    } catch (e: any) {
      console.error("Order update failed", e?.message);
      return res.status(500).json({ message: "Update failed" });
    }
  });

  // ============================================================
  // 📦 CUSTOMER ORDERS - Get user's orders with product & vendor details
  // ============================================================
  app.get("/api/orders/user/:userId", optionalAuth, async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Optional: verify the requesting user owns these orders
      if (req.user && req.user.id !== userId && req.user.role !== Role.SUPER_ADMIN) {
        return res.status(403).json({ message: "Unauthorized access to these orders" });
      }

      const userOrders = await storage.getUserOrders(userId);
      return res.json({ orders: userOrders });
    } catch (e: any) {
      console.error("Fetch user orders failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // --- REVIEWS ---
  app.post("/api/reviews", requireAuth, mutationLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = insertReviewSchema.parse({
        ...req.body,
        userId: req.userId, // Force userId from auth
        isApproved: false,
      });
      // Use Prisma-based storage instead of Drizzle
      const created = await storage.createReview(parsed);
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
      // Use Prisma-based storage instead of Drizzle
      const rows = await storage.getReviews(productId, true);
      return res.json(rows);
    } catch (e: any) {
      console.error("Fetch reviews failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const onlyPending = String(req.query.pending || "").toLowerCase() === "true";
      // Use Prisma-based storage instead of Drizzle
      const rows = await storage.getReviews(undefined, onlyPending);
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
      // Use Prisma-based storage instead of Drizzle
      const updated = await storage.updateReview(id, { isApproved: true });
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
      // Use Prisma-based storage instead of Drizzle
      await storage.deleteReview(id);
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Delete review failed", e?.message);
      return res.status(500).json({ message: "Delete failed" });
    }
  });

  // ============================================================
  // 🛡️ DSSL TRUST LAYER - Vendor Verification API
  // ============================================================
  app.patch("/api/admin/vendors/:id/verify", requireAuth, requireCityAdmin, async (req: Request, res: Response) => {
    try {
      const vendorId = Number(req.params.id);
      if (!Number.isInteger(vendorId) || vendorId <= 0) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }

      // Get the current vendor
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Toggle verification status
      const newIsVerified = !vendor.isVerified;

      // ============================================================
      // DSSL Trust Score Calculation
      // Formula: Score = (Base 50) + (Verification ? 30 : 0) + (Years Active × 2)
      // ============================================================
      const baseScore = 50;
      const verificationBonus = newIsVerified ? 30 : 0;
      const yearsActive = vendor.experience || 0;
      const experienceBonus = yearsActive * 2;
      const newTrustScore = baseScore + verificationBonus + experienceBonus;

      // Update the vendor
      const updatedVendor = await storage.updateVendor(vendorId, {
        isVerified: newIsVerified,
        dsslScore: newTrustScore,
        dsslLastUpdated: new Date(),
        safetyBadges: newIsVerified 
          ? [...new Set([...(vendor.safetyBadges || []), "verified"])] 
          : (vendor.safetyBadges || []).filter((b: string) => b !== "verified")
      });

      console.log(`🛡️ DSSL Trust Update: Vendor ${vendorId} - Verified: ${newIsVerified}, Score: ${newTrustScore}`);

      return res.json({
        success: true,
        vendor: {
          id: updatedVendor.id,
          name: updatedVendor.name,
          isVerified: updatedVendor.isVerified,
          dsslScore: updatedVendor.dsslScore,
          safetyBadges: updatedVendor.safetyBadges
        },
        message: newIsVerified 
          ? `Vendor "${vendor.name}" has been verified! DSSL Trust Score: ${newTrustScore}`
          : `Vendor "${vendor.name}" verification has been revoked. DSSL Trust Score: ${newTrustScore}`
      });
    } catch (e: any) {
      console.error("Vendor verification failed", e?.message);
      return res.status(500).json({ message: e?.message || "Verification failed" });
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
        phone: String(req.body?.contactNumber || req.body?.phone || req.body?.mobile || "0000000000"),
        mobile: String(req.body?.contactNumber || req.body?.mobile || req.body?.phone || "0000000000"),
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
      if (req.user?.role !== Role.SUPER_ADMIN && existing.vendorId !== req.userId) {
        return res.status(403).json({ message: "You can only update your own products" });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      const uploadedUrl = file ? (file as any)?.path || (file as any)?.secure_url : undefined;
      const imageUrl = uploadedUrl ?? req.body?.imageUrl ?? existing.imageUrl ?? "";

      const payload = {
        title: req.body?.name ?? req.body?.title ?? existing.title,
        price: String(req.body?.price ?? existing.price ?? "0"),
        description: req.body?.description ?? existing.description ?? "",
        categoryName: req.body?.category ?? existing.categoryName,
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
          category: ownerShop.category || "General",
          phone: contactNumber || ownerShop.phone || ownerShop.mobile || "0000000000",
          mobile: contactNumber || ownerShop.mobile || ownerShop.phone || "0000000000",
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

  // --- BUS TIMETABLE ---
  app.get("/api/bus-timetable", async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtId = req.districtId || 3; // Default to Shahdol
      
      // Fetch buses from Prisma directly
      const buses = await prisma.busTimetable.findMany({
        where: { districtId },
        orderBy: { fromCity: 'asc' },
      });
      
      return res.json({ data: buses });
    } catch (e: any) {
      console.error("Bus timetable fetch error:", e);
      return res.status(500).json({ message: "Failed to fetch bus timetable", data: [] });
    }
  });

  // --- AI CONCIERGE: Personalized Shopping Assistant with Llama-3 ---
  app.post("/api/ai/concierge", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { message, query: bodyQuery, district = 'shahdol' } = req.body || {};
      const userId = req.userId;
      
      // AI PRIVACY SHIELD: Check consent before processing personal intents
      let hasConsent = false;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { consentGiven: true }
        });
        hasConsent = user?.consentGiven === true;
      } else {
        // Anonymous users are treated as not consented for privacy
        hasConsent = false;
      }
      
      // Support BOTH message AND query keys
      const userMsg = ((message || bodyQuery || "") as string).trim();

      if (!userMsg || typeof userMsg !== 'string') {
        return res.json({ 
          response: "Namaste! Main Shahdol Bazaar AI Assistant hoon. Kya aapko Shahdol mein koi dukan, doctor, ya service chahiye? Bataiye main madad kar sakta hoon!"
        });
      }

      // Get Groq instance - Let Llama handle ALL queries including greetings
      const groq = getGroq();
      
      if (!groq) {
        return res.json({ 
          response: "Namaste! AI brain abhi loading hai. Thodi der mein wapas try karein - main ready ho jaoonga! 🙏" 
        });
      }

      // Fetch vendors and products from database for the district
      const districtData = await storage.getDistrictBySlug(district);
      const districtId = districtData?.id || 3;

      // 🚀 STRIKE 86 FIX: Force districtId to 2 (Shahdol) if slug resolution fails
      let effectiveDistrictId = districtId;
      if (!effectiveDistrictId || effectiveDistrictId <= 0) {
        console.log(`[AI CONCIERGE] District fallback to Shahdol (ID: 2)`);
        effectiveDistrictId = 2;
      }

      const [vendors, products] = await Promise.all([
        prisma.vendor.findMany({ 
          where: { districtId: effectiveDistrictId, status: 'APPROVED' },
          take: 20,
          select: { name: true, category: true, description: true, serviceArea: true }
        }),
        prisma.product.findMany({ 
          where: { approved: true, vendor: { districtId: effectiveDistrictId } },
          take: 30,
          select: { title: true, description: true, price: true, category: { select: { name: true } }, vendor: { select: { name: true } } }
        })
      ]);

      // Create context for AI
      const context = `
VENDORS IN ${districtData?.name?.toUpperCase() || 'SHAHDOL'}:
${vendors.slice(0, 10).map((v: any) => `- ${v.name} (${v.category}) - ${v.description || v.serviceArea || ''}`).join('\n')}

PRODUCTS AVAILABLE:
${products.slice(0, 15).map((p: any) => `- ${p.title} (${p.category?.name || p.category}) - ${p.price ? '₹' + p.price : ''}`).join('\n')}
      `.trim();

      // 🚀 STRIKE 123: MASTER SYSTEM PROMPT - Sovereign Brain
      const SYSTEM_PROMPT = `You are the "Shahdol Bazaar Sovereign AI" - an expert on Shahdol district, Madhya Pradesh, India.

PERSONALITY:
- You are a friendly, knowledgeable local friend from Shahdol
- Use Hinglish (mix of Hindi and English) naturally - like "Bhaiya" and "Namaste!"
- Be warm, helpful, and conversational
- Always end with a gentle invitation to help more

YOUR PRIMARY ROLE:
1. Help users find shops, hospitals, doctors, bus services, schools, and local services in Shahdol
2. Provide information about products available in local markets
3. Recommend trusted local businesses based on user needs

HOWEVER - IMPORTANT:
- If users ask GENERAL questions (who is PM, weather, news, life advice, general knowledge, math, etc.), ANSWER THEM INTELLIGENTLY first in Hinglish
- After answering, GENTLY guide them back: "Lekin agar aapko Shahdol mein koi dukan, doctor, ya service chahiye to main madad kar sakta hoon!"

CONTEXT ABOUT LOCAL MARKETPLACE:
${context}

GUIDELINES:
- Keep responses concise (2-3 sentences max for local queries)
- For general knowledge questions, be thorough but friendly
- Use specific vendor names when relevant
- Always be helpful - no query is "out of syllabus"
- Use Hindi/Hinglish naturally with emojis where appropriate 😊

You are now ready to help!`;

      // 🚀 STRIKE 123: Let Llama 3.3 Think for Itself
      // NO more hardcoded fallbacks - let the AI handle EVERYTHING
      const aiResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Upgraded to 70B for better reasoning
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg }
        ],
        temperature: 0.8, // Slightly higher for more personality
        max_tokens: 350, // More room for detailed responses
      });

      const response = aiResponse.choices[0]?.message?.content || 
        "Namaste! Kuch technical ho gaya, lekin aap phir se try karein - main help karunga!";

      return res.json({ response });

    } catch (error) {
      console.error("AI Concierge error:", error);
      return res.json({ 
        response: "AI thoda confuse ho gaya! Firse try karein ya direct marketplace dekhein!" 
      });
    }
  });

  // --- AI GLOBAL SEARCH: Intent-Powered Search with Semantic Understanding ---
  app.get("/api/global-search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string || "").trim();
      const districtSlug = req.query.district as string || "shahdol";
      
      if (query.length < 2) {
        return res.json({ 
          hospitals: [], vendors: [], products: [], busRoutes: [], 
          intent: null, message: "", aiSuggested: false 
        });
      }

      // Get district
      const district = await storage.getDistrictBySlug(districtSlug);
      const districtId = district?.id || 3;

      // Fetch all data in parallel
      const [vendors, products, hospitals, categories, busRoutes] = await Promise.all([
        prisma.vendor.findMany({ where: { districtId, status: 'APPROVED' }, take: 50, include: { district: true } }),
        prisma.product.findMany({ where: { approved: true }, take: 50, include: { vendor: true, category: true } }),
        prisma.hospital.findMany({ where: { districtId }, take: 20 }),
        prisma.category.findMany({ take: 20 }),
        prisma.busTimetable.findMany({ where: { districtId: 2 }, take: 20 })
      ]);

      const groq = getGroq();
       
      let intentData = {
        intent: "general_search",
        suggestedCategories: [] as string[],
        searchTerms: [query],
        responseMessage: "Searching for you..."
      };

      // Check for emergency keywords - prioritize hospitals
      const emergencyKeywords = ["emergency", "accident", "heart", "delivery", "ambulance", "doctor", "pain", "fever", "ill", "sick", "stomach pain", "chest pain"];
      const isEmergency = emergencyKeywords.some(kw => query.toLowerCase().includes(kw));
      
      if (isEmergency) {
        intentData = {
          intent: "healthcare_emergency",
          suggestedCategories: ["Hospitals", "Clinics", "Medical"],
          searchTerms: [query, "hospital", "clinic", "doctor", "emergency"],
          responseMessage: "🚨 Emergency? Showing nearest hospitals & medical help"
        };
      } else if (groq) {
        // Use AI to analyze intent for non-emergency queries
        try {
          const intentPrompt = `Analyze this search query: "${query}". 
Identify the user's hidden intent. Map to ONE of: RETAIL, SERVICE, HEALTHCARE, EDUCATION, TRANSPORT.
Suggest 3 specific sub-categories relevant to this query.
Return ONLY JSON: {"intent": "...", "suggestedCategories": ["..."], "searchTerms": ["..."], "responseMessage": "..."}`;

          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: intentPrompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 300
          });

          const aiResponse = chatCompletion.choices[0]?.message?.content || "";
          try {
            const parsed = JSON.parse(aiResponse);
            intentData = { ...intentData, ...parsed };
          } catch { /* use defaults */ }
        } catch (aiError) {
          console.warn("🛡️ SOVEREIGN SHIELD: AI intent analysis failed, falling back to keyword search:", aiError);
        }
      }

      // Build search regex from AI-detected terms
      const searchTerms = [...new Set([query, ...(intentData.searchTerms || [])])];
      const searchRegex = searchTerms.map(t => new RegExp(t, "i"));

      // Smart search with AI intent boosting
      const results = {
        // Emergency: prioritize hospitals
        hospitals: isEmergency 
          ? hospitals.slice(0, 10)
          : hospitals.filter(h => 
              searchRegex.some(r => r.test(h.name) || r.test(h.specialties?.join(" ") || ""))
            ).slice(0, 5),
        
        // Vendors
        vendors: vendors.filter(v => 
          searchRegex.some(r => r.test(v.name) || r.test(v.category || "") || r.test(v.description || ""))
        ).slice(0, 5),
        
        // Products
        products: products.filter(p => 
          searchRegex.some(r => 
            r.test(p.title || "") || r.test(p.description || "") || r.test(p.category?.name || "")
          )
        ).slice(0, 5),
        
        // Bus Routes (only for transport-related queries)
        busRoutes: query.toLowerCase().includes("bus") || query.toLowerCase().includes("travel") || query.toLowerCase().includes("route")
          ? busRoutes.filter(b => 
              searchRegex.some(r => r.test(b.fromCity) || r.test(b.toCity))
            ).slice(0, 5)
          : []
      };

      // Log search for analytics
      try {
        await prisma.analyticsEvent.create({
          data: {
            eventType: "search",
            action: "global_search",
            value: { query, intent: intentData.intent, isEmergency },
            districtId,
            source: "api"
          }
        });
      } catch { /* ignore logging errors */ }

      return res.json({
        ...results,
        intent: intentData.intent,
        message: intentData.responseMessage,
        suggestedCategories: intentData.suggestedCategories,
        aiSuggested: true
      });

    } catch (e: any) {
      console.error("Global search error:", e);
      return res.status(500).json({ 
        message: "Search failed",
        hospitals: [], vendors: [], products: [], busRoutes: [] 
      });
    }
  });

  // --- AI PULSE: Get Top Searched Intents ---
  app.get("/api/ai/pulse", mutationLimiter, async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : null;
      
      // Get districtId from slug
      let districtId: number | undefined;
      if (districtSlug) {
        const district = await storage.getDistrictBySlug(districtSlug);
        districtId = district?.id;
      }
      
      // Build where clause
      const where: any = { eventType: "search" };
      if (districtId) where.districtId = districtId;
      
      // Get analytics events from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
      
      // Get search events
      const searchEvents = await prisma.analyticsEvent.findMany({
        where,
        select: { source: true, action: true, value: true },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });
      
      // Count unique search terms
      const searchCounts: Record<string, number> = {};
      searchEvents.forEach(event => {
        const searchTerm = event.value as any;
        if (searchTerm?.query) {
          const term = String(searchTerm.query).toLowerCase();
          searchCounts[term] = (searchCounts[term] || 0) + 1;
        }
      });
      
      // Get top searched terms
      const topSearches = Object.entries(searchCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([term, count]) => ({ term, count }));
      
      // Calculate trends (compare last 7 days vs previous 7 days)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const prev7Days = new Date();
      prev7Days.setDate(prev7Days.getDate() - 14);
      
      const lastWeekEvents = await prisma.analyticsEvent.count({
        where: { ...where, createdAt: { gte: last7Days } }
      });
      const prevWeekEvents = await prisma.analyticsEvent.count({
        where: { ...where, createdAt: { gte: prev7Days, lt: last7Days } }
      });
      
      const trendPercent = prevWeekEvents > 0 
        ? Math.round(((lastWeekEvents - prevWeekEvents) / prevWeekEvents) * 100) 
        : 0;
      
      return res.json({
        topSearches,
        totalSearches: searchEvents.length,
        trendPercent,
        period: "30 days"
      });
    } catch (e) {
      console.error("AI Pulse error:", e);
      return res.json({ topSearches: [], totalSearches: 0, trendPercent: 0 });
    }
  });

  // --- SEMANTIC AI SEARCH: Intent-Based Search Engine ---
  // Uses Groq to understand user intent and return relevant results
  const groq = getGroq();
  
  app.post("/api/ai/semantic-search", mutationLimiter, async (req: Request, res: Response) => {
    try {
      const { query, district } = req.body;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      // Get district context
      let districtId: number | undefined;
      if (district) {
        const districtData = await storage.getDistrictBySlug(district);
        districtId = districtData?.id;
      }

      // Fetch all relevant data for semantic analysis
      const [vendors, products, categories] = await Promise.all([
        prisma.vendor.findMany({
          where: districtId ? { districtId, status: 'APPROVED' } : { status: 'APPROVED' },
          take: 50,
          include: { district: true }
        }),
        prisma.product.findMany({
          where: { approved: true },
          take: 50,
          include: { vendor: true, category: true }
        }),
        prisma.category.findMany({ take: 20 })
      ]);

      // If no Groq API key, fall back to keyword search
      if (!groq) {
        const keywordResults = {
          vendors: vendors.filter(v => 
            v.name.toLowerCase().includes(query.toLowerCase()) ||
            v.category?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5),
          products: products.filter(p => 
            p.title?.toLowerCase().includes(query.toLowerCase()) ||
            p.description?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5),
          categories: categories.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 3)
        };
        
        return res.json({
          query,
          intent: "keyword_fallback",
          message: "Using keyword search (no AI key)",
          ...keywordResults
        });
      }

      // Build context for AI intent analysis
      const context = {
        vendors: vendors.map(v => ({ name: v.name, category: v.category, serviceArea: v.serviceArea })),
        products: products.map(p => ({ title: p.title, description: p.description, category: p.category?.name })),
        categories: categories.map(c => c.name)
      };

      // Use Groq to analyze intent
      const intentPrompt = `You are a semantic search AI for a local marketplace in India called Shahdol Bazaar. 
Analyze this user query: "${query}"

Available data:
- Vendors: ${JSON.stringify(context.vendors.slice(0, 10))}
- Products: ${JSON.stringify(context.products.slice(0, 10))}
- Categories: ${JSON.stringify(context.categories)}

Determine the user's intent and return a JSON response with:
1. "intent": The inferred intent (e.g., "healthcare_search", "product_search", "service_lookup", "emergency")
2. "suggestedCategories": Array of relevant category names
3. "searchTerms": Array of keywords to search for
4. "responseMessage": A helpful message in Hindi-English mix (e.g., "Aapke liye best options...")

Return ONLY valid JSON, no extra text.`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: intentPrompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 500
      });

      const aiResponse = chatCompletion.choices[0]?.message?.content || "{}";
      let intentData;
      
      try {
        intentData = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error("Failed to parse AI intent response:", parseError);
        intentData = {
          intent: "general_search",
          suggestedCategories: [],
          searchTerms: [query],
          responseMessage: "Searching for you..."
        };
      }

      // Search using AI-detected terms
      const searchTerms = intentData.searchTerms || [query];
      const searchRegex = searchTerms.map((t: string) => new RegExp(t, "i"));

      const semanticResults = {
        vendors: vendors.filter((v: any) => 
          searchRegex.some((r: RegExp) => r.test(v.name) || r.test(v.category || ""))
        ).slice(0, 5),
        products: products.filter((p: any) => 
          searchRegex.some((r: RegExp) => 
            r.test(p.title || "") || r.test(p.description || "")
          )
        ).slice(0, 5),
        categories: categories.filter(c => 
          intentData.suggestedCategories?.some((sc: string) => 
            c.name.toLowerCase().includes(sc.toLowerCase())
          )
        ).slice(0, 3)
      };

      // Log the search for analytics
      try {
        await prisma.analyticsEvent.create({
          data: {
            eventType: "search",
            action: "semantic_search",
            value: { query, intent: intentData.intent },
            districtId,
            source: "api"
          }
        });
      } catch (logError) {
        console.warn("Failed to log semantic search:", logError);
      }

      return res.json({
        query,
        intent: intentData.intent,
        message: intentData.responseMessage,
        suggestedCategories: intentData.suggestedCategories,
        ...semanticResults
      });
    } catch (e: any) {
      console.error("Semantic search error:", e);
      return res.status(500).json({ message: "Semantic search failed" });
    }
  });

  // --- PREDICTIVE AI ANALYTICS: Stock & Demand Forecasting ---
  app.get("/api/ai/predictions", mutationLimiter, requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      setNoStore(res);
      
      const daysAhead = Number(req.query?.days) || 7;
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      // Get order data for trend analysis
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          product: {
            include: { vendor: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Analyze order patterns
      const dailyOrders: Record<string, number> = {};
      const categoryOrders: Record<string, number> = {};
      const vendorOrders: Record<string, number> = {};
      
      orders.forEach((order: any) => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
        
        if (order.product?.categoryId) {
          const catName = String(order.product.categoryId);
          categoryOrders[catName] = (categoryOrders[catName] || 0) + 1;
        }
        
        if (order.product?.vendor) {
          const vendorName = order.product.vendor.name || 'Unknown';
          vendorOrders[vendorName] = (vendorOrders[vendorName] || 0) + 1;
        }
      });

      // Calculate trends using simple linear regression
      const dailyCounts = Object.entries(dailyOrders)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Simple prediction: average growth rate
      const recentDays = dailyCounts.slice(-7);
      const olderDays = dailyCounts.slice(-14, -7);
      const recentAvg = recentDays.reduce((a, b) => a + b.count, 0) / Math.max(recentDays.length, 1);
      const olderAvg = olderDays.reduce((a, b) => a + b.count, 0) / Math.max(olderDays.length, 1);
      const growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

      // Predict next N days
      const predictions = [];
      for (let i = 1; i <= daysAhead; i++) {
        const predDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const predictedOrders = Math.round(recentAvg * (1 + growthRate * (i / daysAhead)));
        predictions.push({
          date: predDate.toISOString().split('T')[0],
          predictedOrders: Math.max(0, predictedOrders),
          confidence: Math.max(0.5, 0.9 - (i * 0.05))
        });
      }

      // Identify categories at risk of stockout
      const topCategories = Object.entries(categoryOrders)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count, riskLevel: count < 10 ? 'high' : count < 30 ? 'medium' : 'low' }));

      // Identify vendors needing attention
      const topVendors = Object.entries(vendorOrders)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([vendor, count]) => ({ vendor, orders: count, status: count < 5 ? 'needs_attention' : count < 15 ? 'stable' : 'thriving' }));

      // Get low-stock products
      const lowStockProducts = await prisma.product.findMany({
        where: {
          stock: { lt: 10 }
        },
        take: 10,
        include: { vendor: true }
      });

      return res.json({
        predictions,
        trends: {
          growthRate: Math.round(growthRate * 100),
          recentDailyAvg: Math.round(recentAvg),
          totalOrders30Days: orders.length
        },
        alerts: {
          lowStockProducts: lowStockProducts.map(p => ({
            id: p.id,
            title: p.title,
            stock: p.stock,
            vendor: p.vendor?.name
          })),
          categories: topCategories.filter(c => c.riskLevel !== 'low'),
          vendors: topVendors.filter(v => v.status === 'needs_attention')
        }
      });
    } catch (e: any) {
      console.error("Prediction error:", e);
      return res.status(500).json({ message: "Prediction failed" });
    }
  });

  // --- PULSE MAPS: District Digital Activity ---
  app.get("/api/ai/pulse-maps", mutationLimiter, requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      setNoStore(res);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get all districts
      const districts = await prisma.district.findMany({
        where: { isActive: true }
      });

      // Get activity per district
      const districtActivity = await Promise.all(
        districts.map(async (district) => {
          const [vendorCount, productCount, userCount, searchEvents] = await Promise.all([
            prisma.vendor.count({ where: { districtId: district.id } }),
            prisma.product.count({
              where: {
                vendor: { districtId: district.id },
                approved: true
              }
            }),
            prisma.user.count({ where: { districtId: district.id } }),
            prisma.analyticsEvent.count({
              where: {
                districtId: district.id,
                createdAt: { gte: thirtyDaysAgo }
              }
            })
          ]);

          // Calculate activity score (0-100)
          const activityScore = Math.min(100, 
            Math.round(
              (vendorCount * 2) + 
              (productCount * 0.5) + 
              (userCount * 1) + 
              (searchEvents * 0.2)
            )
          );

          return {
            id: district.id,
            name: district.name,
            slug: district.slug,
            vendorCount,
            productCount,
            userCount,
            searchEvents,
            activityScore,
            activityLevel: activityScore > 70 ? 'high' : activityScore > 30 ? 'medium' : 'low'
          };
        })
      );

      // Sort by activity score
      const sortedByActivity = [...districtActivity].sort((a, b) => b.activityScore - a.activityScore);

      return res.json({
        districts: districtActivity,
        topPerformers: sortedByActivity.slice(0, 3),
        summary: {
          totalVendors: districtActivity.reduce((a, b) => a + b.vendorCount, 0),
          totalProducts: districtActivity.reduce((a, b) => a + b.productCount, 0),
          totalUsers: districtActivity.reduce((a, b) => a + b.userCount, 0),
          totalSearches: districtActivity.reduce((a, b) => a + b.searchEvents, 0)
        }
      });
    } catch (e: any) {
      console.error("Pulse maps error:", e);
      return res.status(500).json({ message: "Pulse maps failed" });
    }
  });

  // --- DSSL SCORE 2.0: Automated Trust Score Calculation ---
  app.post("/api/ai/dssl-update", mutationLimiter, requireAuth, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      setNoStore(res);
      
      // Get all vendors
      const vendors = await prisma.vendor.findMany({});

      const updatedVendors = [];

      for (const vendor of vendors) {
        // Calculate DSSL Score based on multiple factors
        let score = 50; // Base score

        // Factor 1: Recent orders
        const recentOrders = await prisma.order.findMany({
          where: {
            product: { vendorId: vendor.id },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        });
        
        if (recentOrders.length > 0) score += 10;
        if (recentOrders.length > 5) score += 10;

        // Factor 2: Review rating
        const reviews = await prisma.review.findMany({
          where: { product: { vendorId: vendor.id }, isApproved: true }
        });
        if (reviews.length > 0) {
          const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
          score += Math.round(avgRating * 5); // Up to 25 points
        }

        // Factor 3: Product count
        const productCount = await prisma.product.count({
          where: { vendorId: vendor.id, approved: true }
        });
        if (productCount > 5) score += 10;
        if (productCount > 20) score += 10;

        // Factor 4: Verification status
        if (vendor.isVerified) score += 15;

        // Factor 5: Order fulfillment
        if (recentOrders.length > 0) {
          const fulfilledOrders = recentOrders.filter((o: any) => o.status === 'completed' || o.status === 'confirmed');
          const fulfillmentRate = fulfilledOrders.length / recentOrders.length;
          score += Math.round(fulfillmentRate * 10);
        }

        // Cap score at 100
        score = Math.min(100, score);

        // Determine badge
        let badge = 'Bronze';
        if (score >= 90) badge = 'Diamond';
        else if (score >= 75) badge = 'Platinum';
        else if (score >= 60) badge = 'Gold';
        else if (score >= 40) badge = 'Silver';

        // Update vendor
        await prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            dsslScore: score,
            safetyBadges: [badge]
          }
        });

        updatedVendors.push({ id: vendor.id, name: vendor.name, score, badge });
      }

      return res.json({
        success: true,
        updated: updatedVendors.length,
        vendors: updatedVendors
      });
    } catch (e: any) {
      console.error("DSSL update error:", e);
      return res.status(500).json({ message: "DSSL update failed" });
    }
  });

  // --- AI MERCHANT ASSISTANT: Auto-generate product descriptions ---
  app.post("/api/ai/merchant-assist", mutationLimiter, requireAuth, requireMerchant, async (req: Request, res: Response) => {
    try {
      const { productName, category, keywords } = req.body;
      
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }

      // Use Groq to generate description if available
      if (groq) {
        const prompt = `Generate a compelling product description for a marketplace in Shahdol, Madhya Pradesh, India.

Product: ${productName}
Category: ${category || 'General'}
Keywords: ${keywords || ''}

Write in Hindi-English mix (Hinglish) that local customers can relate to. 
Include:
- Key features (2-3 points)
- Why customers should buy
- A call to action

Keep it under 150 words.`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 300
        });

        const description = chatCompletion.choices[0]?.message?.content || "";

        // Suggest category if not provided
        let suggestedCategory = category;
        if (!category && groq) {
          const categoryPrompt = `Given this product: "${productName}", suggest the most appropriate category from: Grocery, Electronics, Fashion, Health & Beauty, Home & Garden, Sports, Education, Services. Return ONLY the category name.`;
          const categoryCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: categoryPrompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 50
          });
          suggestedCategory = categoryCompletion.choices[0]?.message?.content?.trim() || category;
        }

        return res.json({
          success: true,
          productName,
          suggestedCategory,
          generatedDescription: description,
          tags: keywords ? keywords.split(',').map((k: string) => k.trim()) : ['marketplace', 'shahdol', 'local']
        });
      }

      // Fallback without Groq
      return res.json({
        success: true,
        productName,
        suggestedCategory: category || 'General',
        generatedDescription: `Buy ${productName} at Shahdol Bazaar! Best quality, best prices. Free delivery in Shahdol. Order now!`,
        tags: ['marketplace', 'shahdol', 'local']
      });
    } catch (e: any) {
      console.error("Merchant assist error:", e);
      return res.status(500).json({ message: "Merchant assist failed" });
    }
  });

  // ============================================
  // DISTRICT ANALYTICS APIs
  // ============================================

  // --- ADMIN: GET District Stats by Slug ---
  app.get("/api/admin/district/:slug/stats", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      // Find district by slug
      const district = await storage.getDistrictBySlug(slug);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      
      // Get real counts from database
      const totalPartners = await storage.getVendorCountByDistrict(district.id);
      const pendingApprovals = await storage.getPendingVendorCountByDistrict(district.id);
      const totalListings = await storage.getProductCountByDistrict(district.id);
      const totalUsers = await storage.getUserCountByDistrict(district.id);
      
      // Return with frontend-expected field names
      return res.json({
        totalVendors: totalPartners,
        pendingVendors: pendingApprovals,
        approvedVendors: totalPartners - pendingApprovals,
        totalProducts: totalListings,
        pendingProducts: 0, // Not implemented yet
        totalUsers
      });
    } catch (e: any) {
      console.error("District stats fetch failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch district stats" });
    }
  });

  // --- ADMIN: GET Pending Vendors by District Slug ---
  app.get("/api/admin/district/:slug/pending-vendors", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      // Find district by slug
      const district = await storage.getDistrictBySlug(slug);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      
      // Get pending vendors for this district
      const pendingVendors = await storage.getPendingVendorsByDistrict(district.id);
      
      return res.json({ data: pendingVendors });
    } catch (e: any) {
      console.error("Pending vendors fetch failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch pending vendors" });
    }
  });

  // ============================================
  // SOVEREIGN COMMAND CENTER - Admin APIs
  // ============================================

  // --- ADMIN: GET All Districts ---
  app.get("/api/admin/districts", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const districts = await storage.getAllDistricts();
      return res.json({ data: districts });
    } catch (e: any) {
      console.error("Districts fetch failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch districts" });
    }
  });

  // --- ADMIN: CREATE District ---
  app.post("/api/admin/districts", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { name, slug, state, primaryColor, secondaryColor, logoUrl, faviconUrl, dsslContact, dsslEmail, isActive, isDefault, metaTitle, metaDescription } = req.body;

      if (!name || !slug || !state) {
        return res.status(400).json({ message: "Name, slug, and state are required" });
      }

      // Check if slug already exists
      const existing = await storage.getDistrictBySlug(slug);
      if (existing) {
        return res.status(400).json({ message: "District with this slug already exists" });
      }

      const district = await storage.createDistrict({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        state,
        primaryColor,
        secondaryColor,
        logoUrl,
        faviconUrl,
        dsslContact,
        dsslEmail,
        isActive,
        isDefault,
        metaTitle,
        metaDescription,
      });

      return res.status(201).json(district);
    } catch (e: any) {
      console.error("District creation failed", e?.message);
      return res.status(500).json({ message: "Failed to create district" });
    }
  });

  // --- ADMIN: PATCH Vendor Status (Approve/Reject/Pending) ---
  app.patch("/api/admin/vendors/:id/status", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const vendorId = Number(req.params.id);
      if (!Number.isInteger(vendorId) || vendorId <= 0) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }

      const { status } = req.body;
      if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ message: "Status must be APPROVED, REJECTED, or PENDING" });
      }

      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const updated = await storage.updateVendor(vendorId, { status });
      
      console.log(`📋 Vendor Status Update: Vendor ${vendorId} - Status: ${status}`);

      return res.json({
        success: true,
        vendor: {
          id: updated.id,
          name: updated.name,
          status: updated.status
        },
        message: `Vendor "${vendor.name}" status changed to ${status}`
      });
    } catch (e: any) {
      console.error("Vendor status update failed", e?.message);
      return res.status(500).json({ message: e?.message || "Status update failed" });
    }
  });

  // --- ADMIN: GET All Users ---
  app.get("/api/admin/users", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      return res.json({ data: users });
    } catch (e: any) {
      console.error("Users fetch failed", e?.message);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // --- ADMIN: PATCH User Role (Promote to District Admin or Merchant) ---
  app.patch("/api/admin/users/:id/role", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const { role, districtId } = req.body;
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      const validRoles = ['customer', 'seller', 'merchant', 'admin', 'DISTRICT_ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Map new role to legacy role
      const legacyRole = role === 'SUPER_ADMIN' ? 'admin' : role === 'DISTRICT_ADMIN' ? 'admin' : role;
      const isAdmin = role === 'SUPER_ADMIN' || role === 'DISTRICT_ADMIN' || role === 'admin';

      const updateData: any = {
        role: legacyRole,
        isAdmin
      };

      // Add districtId for DISTRICT_ADMIN
      if (districtId && (role === 'DISTRICT_ADMIN' || role === 'admin')) {
        updateData.districtId = districtId;
      }

      const updated = await storage.updateUser(userId, updateData);

      console.log(`👤 User Role Update: User ${userId} - Role: ${role}`);

      return res.json({
        success: true,
        user: {
          id: updated.id,
          username: updated.username,
          role: role,
          isAdmin: updated.isAdmin
        },
        message: `User "${user.username}" promoted to ${role}`
      });
    } catch (e: any) {
      console.error("User role update failed", e?.message);
      return res.status(500).json({ message: e?.message || "Role update failed" });
    }
  });

  // --- ADMIN: Global Search (Vendors, Products, Orders, Users) ---
  app.get("/api/admin/search", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const query = typeof req.query?.q === "string" ? req.query.q.trim() : "";
      const type = typeof req.query?.type === "string" ? req.query.type : "all"; // all, vendors, products, orders, users
      const page = Math.max(1, parseInt(req.query?.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query?.limit as string) || 20)); // Max 50, default 20
      const skip = (page - 1) * limit;

      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const results: any = {
        vendors: [],
        products: [],
        orders: [],
        users: []
      };

      const totalCount: any = {
        vendors: 0,
        products: 0,
        orders: 0,
        users: 0
      };

      const searchTerm = `%${query}%`;

      // Search Vendors (across all districts)
      if (type === 'all' || type === 'vendors') {
        const [vendors, vendorCount] = await Promise.all([
          prisma.vendor.findMany({
            where: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { slug: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { mobile: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            skip,
            take: limit,
            orderBy: { name: 'asc' },
            include: { district: true }
          }),
          prisma.vendor.count({
            where: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { slug: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { mobile: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          })
        ]);
        results.vendors = vendors;
        totalCount.vendors = vendorCount;
      }

      // Search Products (across all districts via vendors)
      if (type === 'all' || type === 'products') {
        const [products, productCount] = await Promise.all([
          prisma.product.findMany({
            where: {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { vendor: true, category: true }
          }),
          prisma.product.count({
            where: {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          })
        ]);
        results.products = products;
        totalCount.products = productCount;
      }

      // Search Orders
      if (type === 'all' || type === 'orders') {
        const [orders, orderCount] = await Promise.all([
          prisma.order.findMany({
            where: {
              OR: [
                { id: Number(query) || 0 },
                { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
                { customerName: { contains: searchTerm, mode: 'insensitive' } },
                { customerAddress: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { product: true }
          }),
          prisma.order.count({
            where: {
              OR: [
                { id: Number(query) || 0 },
                { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
                { customerName: { contains: searchTerm, mode: 'insensitive' } },
                { customerAddress: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          })
        ]);
        results.orders = orders;
        totalCount.orders = orderCount;
      }

      // Search Users
      if (type === 'all' || type === 'users') {
        const [users, userCount] = await Promise.all([
          prisma.user.findMany({
            where: {
              OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { district: true }
          }),
          prisma.user.count({
            where: {
              OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          })
        ]);
        results.users = users;
        totalCount.users = userCount;
      }

      // Check for unmet demands (AI Intent)
      const unmetDemands: string[] = [];
      const queryLower = query.toLowerCase();
      
      // Common unmet demand patterns
      if (queryLower.includes('oxygen') || queryLower.includes('icu') || queryLower.includes('ambulance')) {
        unmetDemands.push("Healthcare services in this area");
      }
      if (queryLower.includes('tuit') || queryLower.includes('coach') || queryLower.includes('classes')) {
        unmetDemands.push("Educational coaching centers");
      }
      if (queryLower.includes('plumber') || queryLower.includes('electrician') || queryLower.includes('carpenter')) {
        unmetDemands.push("Skilled service providers");
      }

      return res.json({
        query,
        type,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil((type === 'all' 
          ? totalCount.vendors + totalCount.products + totalCount.orders + totalCount.users 
          : totalCount[type as keyof typeof totalCount]) / limit),
        results,
        unmetDemands,
        total: results.vendors.length + results.products.length + results.orders.length + results.users.length
      });
    } catch (e: any) {
      console.error("Search failed", e?.message);
      return res.status(500).json({ message: "Search failed" });
    }
  });

  // --- USER: Neural Recommendation Engine - Personalized 'For You' Feed ---
  app.get("/api/user/for-you", optionalAuth, async (req: Request, res: Response) => {
    try {
      // Get user ID if authenticated, otherwise use session
      const userId = req.userId;
      const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string || "anonymous";
      
      // AI PRIVACY SHIELD: Check consent before personalizing recommendations
      let hasConsent = false;
      let user = null;
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: { consentGiven: true }
        });
        hasConsent = user?.consentGiven === true;
      }
      
      // If no consent, return generic recommendations without personalization
      if (!hasConsent) {
        // Return generic trending products/vendors without personalizing
        const districtSlug = typeof req.query?.district === "string" ? req.query.district : "shahdol";
        const district = await storage.getDistrictBySlug(districtSlug);
        // 🚀 STRIKE 86 FIX: Force districtId to 3 (Shahdol) if slug resolution fails
        let effectiveDistrictId = district?.id || 3;
        if (!effectiveDistrictId || effectiveDistrictId <= 0) {
          console.log(`[FOR-YOU] District fallback to Shahdol (ID: 3)`);
          effectiveDistrictId = 3;
        }
        
        const [trendingVendors, trendingProducts, categories] = await Promise.all([
          prisma.vendor.findMany({
            where: { districtId: effectiveDistrictId, status: "APPROVED" },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, slug: true, category: true, description: true, logo: true, images: true, districtId: true, businessType: true, status: true, createdAt: true, isVerified: true, dsslScore: true, safetyBadges: true, isHospital: true }
          }),
          prisma.product.findMany({
            where: { approved: true, vendor: { districtId: effectiveDistrictId } },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, description: true, price: true, images: true, category: true, vendor: { select: { id: true, name: true, slug: true } } }
          }),
          prisma.category.findMany({ take: 10 })
        ]);
        
        return res.json({
          personalized: false,
          consentRequired: true,
          message: "Enable AI personalization by providing consent in your profile settings",
          recommendations: {
            vendors: trendingVendors.map(v => ({ ...v, matchScore: 0, matchReason: "Trending" })),
            products: trendingProducts,
            categories
          },
          userIntents: []
        });
      }
      
      // Get district from query (default: Shahdol)
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : "shahdol";
      const district = await storage.getDistrictBySlug(districtSlug);
      // 🚀 STRIKE 86 FIX: Force districtId to 2 (Shahdol) if slug resolution fails
      let districtId = district?.id || 3;
      if (!districtId || districtId <= 0) {
        console.log(`[FOR-YOU] District fallback to Shahdol (ID: 2)`);
        districtId = 2;
      }

      // Fetch user's past search intents (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get user-specific events or session-based events
      const userEvents = await prisma.analyticsEvent.findMany({
        where: {
          OR: [
            { userId: userId || undefined },
            { sessionId: userId ? undefined : sessionId }
          ],
          eventType: "search",
          createdAt: { gte: thirtyDaysAgo }
        },
        select: { value: true, action: true },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Extract user intent patterns
      const userIntents: Record<string, number> = {};
      for (const event of userEvents) {
        const value = event.value as any;
        const intent = value?.intent || value?.query || event.action || "general";
        userIntents[intent] = (userIntents[intent] || 0) + 1;
      }

      // Sort intents by frequency
      const topUserIntents = Object.entries(userIntents)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count }));

      // Get trending products and vendors for the district
      let trendingVendors = await prisma.vendor.findMany({
        where: { districtId, status: "APPROVED" },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { district: true }
      });

      // 🔒 STRIKE 77 SHADOW DATA FALLBACK: If no APPROVED vendors,
      // return PENDING vendors as 'Coming Soon' to ensure page never looks empty
      if (trendingVendors.length === 0) {
        console.log(`[SHADOW DATA] No APPROVED vendors for district ${districtId} - fetching PENDING as 'Coming Soon'`);
        const pendingVendors = await prisma.vendor.findMany({
          where: { districtId, status: "PENDING" },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { district: true }
        });
        
        if (pendingVendors.length > 0) {
          // Mark as Coming Soon with a special flag
          trendingVendors = pendingVendors.map(v => ({
            ...v,
            isComingSoon: true,
            matchScore: 0,
            matchReason: "Coming Soon"
          }));
        }
      }

      const [trendingProducts, categories] = await Promise.all([
        prisma.product.findMany({
          where: { 
            approved: true,
            vendor: { districtId }
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, description: true, price: true, images: true, category: { select: { id: true, name: true } }, vendor: { select: { id: true, name: true, slug: true } } }
        }),
        prisma.category.findMany({ take: 20 })
      ]);

      // Get recent search trends in the district for fallback
      const recentSearches = await prisma.analyticsEvent.findMany({
        where: {
          eventType: "search",
          districtId,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: { value: true },
        take: 500
      });

      // Aggregate trending intents from all users in district
      const districtTrends: Record<string, number> = {};
      for (const event of recentSearches) {
        const value = event.value as any;
        const intent = value?.intent || value?.query || "general";
        districtTrends[intent] = (districtTrends[intent] || 0) + 1;
      }

      const topDistrictTrends = Object.entries(districtTrends)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count }));

      // If no user history, use district trends
      const activeIntents = topUserIntents.length > 0 ? topUserIntents : topDistrictTrends;

      // Score and match vendors/products to user intents
      const groq = getGroq();
      
      let personalizedRecommendations = {
        vendors: [] as typeof trendingVendors,
        products: [] as typeof trendingProducts
      };

      if (groq && activeIntents.length > 0) {
        try {
          const matchPrompt = `You are a recommendation engine for Shahdol Bazaar marketplace.

USER'S PAST INTERESTS (intent: count):
${JSON.stringify(activeIntents)}

AVAILABLE VENDORS:
${JSON.stringify(trendingVendors.slice(0, 10).map(v => ({ name: v.name, category: v.category, serviceArea: v.serviceArea })))}

AVAILABLE PRODUCTS:
${JSON.stringify(trendingProducts.slice(0, 10).map(p => ({ title: p.title, category: p.category?.name })))}

Match vendors and products to user's interests. Calculate a 'matchScore' (0-100) for each.
Return ONLY JSON:
{
  "vendorMatches": [{ "vendorId": number, "matchScore": number, "reason": "string" }],
  "productMatches": [{ "productId": number, "matchScore": number, "reason": "string" }]
}`;

          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: matchPrompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 800
          });

          const aiResponse = chatCompletion.choices[0]?.message?.content || "{}";
          const matches = JSON.parse(aiResponse);

          // Apply match scores to vendors
          if (matches.vendorMatches) {
            const vendorMap = new Map(trendingVendors.map(v => [v.id, v]));
            personalizedRecommendations.vendors = matches.vendorMatches
              .filter((m: any) => vendorMap.has(m.vendorId))
              .map((m: any) => ({ ...vendorMap.get(m.vendorId), matchScore: m.matchScore, matchReason: m.reason }))
              .sort((a: any, b: any) => b.matchScore - a.matchScore)
              .slice(0, 10);
          }

          // Apply match scores to products
          if (matches.productMatches) {
            const productMap = new Map(trendingProducts.map(p => [p.id, p]));
            personalizedRecommendations.products = matches.productMatches
              .filter((m: any) => productMap.has(m.productId))
              .map((m: any) => ({ ...productMap.get(m.productId), matchScore: m.matchScore, matchReason: m.reason }))
              .sort((a: any, b: any) => b.matchScore - a.matchScore)
              .slice(0, 10);
          }
        } catch (aiError) {
          console.warn("AI matching failed, using fallback:", aiError);
        }
      }

      // Fallback: simple keyword matching if AI fails
      if (personalizedRecommendations.vendors.length === 0) {
        const intentKeywords = activeIntents.map(i => i.intent.toLowerCase());
        personalizedRecommendations.vendors = trendingVendors
          .filter(v => intentKeywords.some(kw => 
            v.name?.toLowerCase().includes(kw) || 
            v.category?.toLowerCase().includes(kw) ||
            v.description?.toLowerCase().includes(kw)
          ))
          .slice(0, 10)
          .map(v => ({ ...v, matchScore: Math.floor(Math.random() * 30) + 70, matchReason: "Matches your interests" }));

        if (personalizedRecommendations.vendors.length === 0) {
          // Return trending as fallback
          personalizedRecommendations.vendors = trendingVendors.slice(0, 10).map(v => ({ 
            ...v, 
            matchScore: Math.floor(Math.random() * 20) + 60, 
            matchReason: "Trending in your area" 
          }));
        }
      }

      if (personalizedRecommendations.products.length === 0) {
        const intentKeywords = activeIntents.map(i => i.intent.toLowerCase());
        personalizedRecommendations.products = trendingProducts
          .filter(p => intentKeywords.some(kw => 
            p.title?.toLowerCase().includes(kw) || 
            p.category?.name?.toLowerCase().includes(kw)
          ))
          .slice(0, 10)
          .map(p => ({ ...p, matchScore: Math.floor(Math.random() * 30) + 70, matchReason: "Matches your interests" }));

        if (personalizedRecommendations.products.length === 0) {
          personalizedRecommendations.products = trendingProducts.slice(0, 10).map(p => ({ 
            ...p, 
            matchScore: Math.floor(Math.random() * 20) + 60, 
            matchReason: "Popular choice" 
          }));
        }
      }

      return res.json({
        userId: userId || null,
        sessionId,
        district: districtSlug,
        generatedAt: new Date().toISOString(),
        userIntents: activeIntents,
        recommendations: {
          vendors: personalizedRecommendations.vendors.slice(0, 10),
          products: personalizedRecommendations.products.slice(0, 10)
        },
        hasPersonalization: topUserIntents.length > 0
      });

    } catch (e: any) {
      console.error("For You error:", e);
      return res.status(500).json({ message: "Failed to generate recommendations", error: e.message });
    }
  });

  // --- ADMIN: AI Insight Aggregator - Predictive Demand-Supply Analysis ---
  // Uses optionalAuth to allow public access to trending data (Search Intents, Trending Categories)
  // Admin Recommendations (insights, pendingApprovals) are only returned for Admin/SuperAdmin users
  app.get("/api/admin/ai-insights", optionalAuth, async (req: Request, res: Response) => {
    try {
      // SECURITY: If token is invalid, req.user will be empty. Proceed as guest.
      const isAdmin = req.user && (req.user.role === 'SUPER_ADMIN' || req.user.isAdmin === true);
      // Get district from query (default: Shahdol)
      const districtSlug = typeof req.query?.district === "string" ? req.query.district : "shahdol";
      const district = await storage.getDistrictBySlug(districtSlug);
      const districtId = district?.id || 3;

      // Fetch recent search intents from AnalyticsEvent (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const searchEvents = await prisma.analyticsEvent.findMany({
        where: {
          eventType: "search",
          districtId,
          createdAt: { gte: sevenDaysAgo }
        },
        select: { action: true, value: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500
      });

      // Extract and aggregate search intents
      const intentCounts: Record<string, number> = {};
      const intentDetails: Record<string, { query: string; intent: string }[]> = {};
      
      for (const event of searchEvents) {
        const value = event.value as any;
        const intent = value?.intent || value?.query || "general_search";
        const query = value?.query || "";
        
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        
        if (!intentDetails[intent]) intentDetails[intent] = [];
        if (intentDetails[intent].length < 5) {
          intentDetails[intent].push({ query, intent });
        }
      }

      // Get current vendor/service worker counts by category
      const vendors = await prisma.vendor.findMany({
        where: { districtId, status: "APPROVED" },
        select: { category: true, businessType: true, status: true }
      });

      // Aggregate vendor counts by category
      const vendorCounts: Record<string, { total: number; active: number; pending: number }> = {};
      for (const v of vendors) {
        const cat = v.category || "Other";
        if (!vendorCounts[cat]) {
          vendorCounts[cat] = { total: 0, active: 0, pending: 0 };
        }
        vendorCounts[cat].total++;
        if (v.status === "APPROVED") {
          vendorCounts[cat].active++;
        } else if (v.status === "PENDING") {
          vendorCounts[cat].pending++;
        }
      }

      // Get pending approvals count
      const pendingCount = await prisma.vendor.count({
        where: { districtId, status: "PENDING" }
      });

      // Sort intents by frequency
      const topIntents = Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([intent, count]) => ({
          intent,
          count,
          sampleQueries: intentDetails[intent]?.slice(0, 3).map(d => d.query) || []
        }));

      // If no search data, return fallback insights
      if (topIntents.length === 0) {
        return res.json({
          district: districtSlug,
          generatedAt: new Date().toISOString(),
          // Public data - always included
          trendingCategories: [],
          searchVolume: 0,
          topIntents: [],
          // Private admin data - only for Admin/SuperAdmin
          ...(isAdmin && {
            insights: [
              {
                type: "info",
                priority: "low",
                title: "Building Search Data",
                message: "AI is learning from user searches. Check back later for insights.",
                recommendation: "Encourage users to search for local services",
                actionType: "awareness",
                relatedCategory: null
              }
            ],
            pendingApprovals: pendingCount
          })
        });
      }

      // Use Groq AI to analyze demand-supply gaps
      const groq = getGroq();
      
      let aiRecommendations: any[] = [];

      if (groq) {
        try {
          const aiPrompt = `Analyze this marketplace data for Shahdol Bazaar district:

TOP SEARCH INTENTS (what users are searching for):
${JSON.stringify(topIntents.slice(0, 10), null, 2)}

CURRENT VENDOR AVAILABILITY (by category):
${JSON.stringify(vendorCounts, null, 2)}

Identify demand-supply gaps and provide 3 actionable recommendations for the Admin.

Return ONLY a JSON array with this exact structure (no extra text):
[
  {
    "type": "critical|warning|info",
    "priority": "high|medium|low",
    "title": "Short title",
    "message": "What's happening",
    "recommendation": "Actionable step for admin",
    "actionType": "approve_pending|recruit|promote|create_category",
    "relatedCategory": "Category name or null"
  }
]`;

          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: aiPrompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.4,
            max_tokens: 1000
          });

          const aiResponse = chatCompletion.choices[0]?.message?.content || "[]";
          try {
            aiRecommendations = JSON.parse(aiResponse);
          } catch { /* use fallback */ }
        } catch (aiError) {
          console.warn("AI insights generation failed:", aiError);
        }
      }

      // Fallback recommendations if AI fails
      if (aiRecommendations.length === 0) {
        // Find categories with high search demand but low vendor supply
        const gaps: string[] = [];
        for (const intent of topIntents) {
          const searchTerm = intent.intent.toLowerCase();
          const relatedCat = Object.keys(vendorCounts).find(cat => 
            searchTerm.includes(cat.toLowerCase()) || cat.toLowerCase().includes(searchTerm)
          );
          
          if (relatedCat && vendorCounts[relatedCat].total < 3) {
            gaps.push(`${relatedCat}: Only ${vendorCounts[relatedCat].total} vendors but high demand`);
          }
        }

        aiRecommendations = [
          ...(pendingCount > 0 ? [{
            type: "warning",
            priority: "high",
            title: "Pending Approvals",
            message: `${pendingCount} vendor/service profiles waiting for approval`,
            recommendation: "Review and approve pending profiles to fill supply gaps",
            actionType: "approve_pending",
            relatedCategory: null
          }] : []),
          ...gaps.slice(0, 2).map(gap => ({
            type: "critical",
            priority: "high",
            title: "Supply Gap Detected",
            message: gap,
            recommendation: "Recruit more vendors in this category",
            actionType: "recruit",
            relatedCategory: gap.split(":")[0]
          }))
        ];
      }

      // Get trending categories (high search volume + low supply)
      const trendingCategories = topIntents
        .filter(t => {
          const relatedCat = Object.keys(vendorCounts).find(cat => 
            t.intent.toLowerCase().includes(cat.toLowerCase()) || 
            cat.toLowerCase().includes(t.intent.toLowerCase())
          );
          const count = relatedCat ? vendorCounts[relatedCat]?.total || 0 : 0;
          return t.count > 5 && count < 5; // High demand, low supply
        })
        .slice(0, 5)
        .map(t => ({ 
          category: t.intent, 
          searches: t.count,
          vendors: Object.entries(vendorCounts).find(([cat]) => 
            t.intent.toLowerCase().includes(cat.toLowerCase()) || 
            cat.toLowerCase().includes(t.intent.toLowerCase())
          )?.[1]?.total || 0
        }));

      return res.json({
        district: districtSlug,
        districtId,
        generatedAt: new Date().toISOString(),
        // Public data - always included
        trendingCategories,
        searchVolume: searchEvents.length,
        topIntents: topIntents.slice(0, 5),
        // Private admin data - only for Admin/SuperAdmin
        ...(isAdmin && {
          insights: aiRecommendations,
          pendingApprovals: pendingCount
        })
      });

    } catch (e: any) {
      console.error("AI insights error:", e);
      return res.status(500).json({ message: "Failed to generate insights", error: e.message });
    }
  });

  return httpServer;
}