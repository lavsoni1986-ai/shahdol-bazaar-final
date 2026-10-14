import express, { type Request, type Response } from "express";
import { prisma } from "../../storage";
import { findVendorsByCategory, countVendorsByDistrict, countVendorsByCategory, findVendorBySlug } from "../../repositories/vendor.repo";
import { mapVendorByType } from "../../dto/entity.dto";
import { countActiveProductsByDistrict } from "../../repositories/product.repo";
import { ErrorCode, sendError, sendSuccess } from "../../middleware/errorHandler";
import logger from "../../middleware/logger";
import { mutationLimiter } from "../../auth/rateLimiter";

const router = express.Router();

// ============================================
// 📊 PUBLIC INSIGHTS
// ============================================

// --- PUBLIC STATS (No Auth Required) ---
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const districtSlug = req.query.district as string; // 👈 slug पकड़ें
    let districtId = req.districtId;

    if (districtSlug) {
      const district = await prisma.district.findUnique({ where: { slug: districtSlug } });
      if (district) districtId = district.id;
    }

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
    }

    const strictDistrictId = Number(districtId);

    const [vendors, products, activeUsers] = await Promise.all([
      countVendorsByDistrict(strictDistrictId),
      countActiveProductsByDistrict(strictDistrictId),
      prisma.user.count({ where: { role: "customer", districtId: strictDistrictId } })
    ]);

    return sendSuccess(res, { vendors, services: products, activeUsers });
  } catch (err) {
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to fetch stats");
  }
});



// --- LEAD TRACKING ---
router.post("/leads", mutationLimiter, async (req: Request, res: Response) => {
  try {
    const { source, action, itemId, itemName, category, searchTerm, productId, vendorId, shopId, customerName, customerPhone, message } = req.body;
    const userId = req.ctx?.userId || null;

    // 1. Authoritative Server-Side District Context Resolution
    const serverDistrictId = req.ctx?.districtId || req.districtId;
    const strictDistrictId = serverDistrictId && !isNaN(Number(serverDistrictId)) ? Number(serverDistrictId) : null;

    // 2. Validate and Verify Target Vendor / Shop if provided
    const rawTargetId = vendorId || shopId;
    let validatedShopId: number | null = null;
    let validatedShopName: string | null = null;

    if (rawTargetId !== undefined && rawTargetId !== null) {
      const parsedId = Number(rawTargetId);
      if (isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
        return sendError(res, 400, ErrorCode.BAD_REQUEST, "Invalid vendor or shop ID format");
      }

      // If a district is resolved, the target vendor MUST belong to that district
      const vendorQuery: any = { id: parsedId };
      if (strictDistrictId !== null) {
        vendorQuery.districtId = strictDistrictId;
      }

      const existingVendor = await prisma.vendor.findFirst({
        where: vendorQuery,
        select: { id: true, name: true, districtId: true }
      });

      if (!existingVendor) {
        return sendError(res, 404, ErrorCode.NOT_FOUND, "Target vendor not found in the current district");
      }

      validatedShopId = existingVendor.id;
      validatedShopName = existingVendor.name;
    }

    // 3. Bound and Sanitize String Inputs
    const cleanSource = typeof source === "string" ? source.trim().slice(0, 50) : "WHATSAPP_INQUIRY";
    const cleanAction = typeof action === "string" ? action.trim().slice(0, 50) : "click";
    const cleanCustomerName = typeof customerName === "string" && customerName.trim() ? customerName.trim().slice(0, 100) : null;
    const cleanCustomerPhone = typeof customerPhone === "string" && customerPhone.trim() ? customerPhone.trim().slice(0, 20) : null;

    // Build bounded message string
    let combinedMessage = typeof message === "string" ? message.trim() : "";
    if (itemName && typeof itemName === "string") {
      combinedMessage += (combinedMessage ? " | " : "") + `Item: ${itemName.trim().slice(0, 100)}`;
    }
    if (itemId || productId) {
      const cleanProdId = String(itemId || productId).trim().slice(0, 50);
      combinedMessage += (combinedMessage ? " | " : "") + `ID: ${cleanProdId}`;
    }
    if (category && typeof category === "string") {
      combinedMessage += (combinedMessage ? " | " : "") + `Category: ${category.trim().slice(0, 50)}`;
    }
    if (searchTerm && typeof searchTerm === "string") {
      combinedMessage += (combinedMessage ? " | " : "") + `Search: ${searchTerm.trim().slice(0, 100)}`;
    }

    const finalMessage = combinedMessage ? combinedMessage.slice(0, 1000) : null;

    // 4. Construct Safe Metadata — Never trust client-supplied districtId to override authority
    const safeMetadata: Record<string, any> = {
      districtId: strictDistrictId,
      userId,
      targetVendorId: validatedShopId,
    };
    if (productId) {
      safeMetadata.productId = Number(productId) || String(productId).slice(0, 50);
    }

    // 5. Create lead record
    const lead = await prisma.lead.create({
      data: {
        source: cleanSource,
        action: cleanAction,
        shopId: validatedShopId,
        shopName: validatedShopName,
        customerName: cleanCustomerName,
        customerPhone: cleanCustomerPhone,
        message: finalMessage,
        metadata: safeMetadata,
        status: "new",
      }
    });

    return sendSuccess(res, { leadId: lead.id });
  } catch (err: any) {
    console.error("Lead tracking error:", err?.message);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Lead recorded locally only");
  }
});

// ==========================================
// 🏥 GET HOSPITALS (STRICT SOVEREIGN MODE - PAGINATED)
// ==========================================
router.get("/hospitals", async (req: Request, res: Response) => {
  if (!req.districtId) {
    return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
  }
  const districtId = Number(req.districtId);
  const page = Math.max(1, Number(req.query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
  const skip = (page - 1) * limit;

  console.log("🏥 HOSPITALS (as VENDORS): districtId =", districtId, "page =", page);

  // 🔴 FIX: Hospitals are now Vendors with category = 'HOSPITAL'
  const [hospitals, total] = await Promise.all([
    findVendorsByCategory('HOSPITAL', districtId),
    countVendorsByCategory('HOSPITAL', districtId)
  ]);

  const mapped = await Promise.all(hospitals.map((h) => mapVendorByType(h)));
  return sendSuccess(res, mapped);
});

// --- FETCH HOSPITAL BY SLUG ---
router.get("/hospitals/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params;
  const districtId = req.districtId ? Number(req.districtId) : undefined;

  try {
    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
    }

    logger.info('Hospital lookup initiated', {
      districtId,
      metadata: { slug, route: '/hospitals/:slug' }
    });

    // 🔴 FIX: Hospitals are Vendors with category='HOSPITAL'
    const hospital = await findVendorBySlug(slug, districtId, 'HOSPITAL');

    if (!hospital) {
      logger.warn('Hospital not found', {
        districtId,
        metadata: { slug, route: '/hospitals/:slug' }
      });
      return res.status(404).json({ success: false });
    }

    return res.json({
      success: true,
      data: await mapVendorByType(hospital)
    });
  } catch (e: any) {
    logger.error('Hospital lookup failed', {
      districtId,
      metadata: { slug, route: '/hospitals/:slug' },
      error: e?.message || 'Unknown error'
    });
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Internal server error");
  }
});

// --- FETCH SCHOOLS BY DISTRICT (PAGINATED) ---
router.get("/schools", async (req: Request, res: Response) => {
  if (!req.districtId) {
    return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
  }
  const districtId = Number(req.districtId);
  const page = Math.max(1, Number(req.query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
  const skip = (page - 1) * limit;

  console.log("🎓 SCHOOLS: districtId =", districtId, "page =", page, "limit =", limit);

  const [schools, total] = await Promise.all([
    prisma.schools.findMany({
      where: { districtId, isActive: true },
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.schools.count({ where: { districtId, isActive: true } })
  ]);

  return sendSuccess(res, schools);
});

// --- FETCH SINGLE SCHOOL BY ID (SECURED) ---
router.get("/schools/:id", async (req: Request, res: Response) => {
  if (!req.districtId) {
    return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
  }
  const districtId = Number(req.districtId);
  const schoolId = Number(req.params.id);
  console.log("🎓 SCHOOL DETAIL: id =", schoolId, "districtId =", districtId);

  if (!schoolId) {
    return sendError(res, 400, ErrorCode.BAD_REQUEST, "School ID required");
  }

  const school = await prisma.schools.findFirst({
    where: { id: schoolId, districtId, isActive: true }
  });

  if (!school) {
    return sendError(res, 404, ErrorCode.NOT_FOUND, "School not found");
  }

  return sendSuccess(res, school);
});

// ==========================================
// 🔧 GET SERVICE WORKERS (STRICT SOVEREIGN MODE - PAGINATED)
// ==========================================
router.get("/service-workers", async (req: Request, res: Response) => {
  try {
    const districtId = req.districtId;
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
    const skip = (page - 1) * limit;

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "Sovereign Error: District context required.");
    }

    const [workers, total] = await Promise.all([
      prisma.serviceWorker.findMany({
        where: { districtId: districtId, isActive: true, isVerified: true },
        skip,
        take: limit,
        orderBy: { dsslScore: 'desc' }
      }),
      prisma.serviceWorker.count({ where: { districtId: districtId, isActive: true, isVerified: true } })
    ]);

    return sendSuccess(res, workers);
  } catch (e: any) {
    console.error("🚨 Service Worker fetch error:", e.message);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to fetch service workers");
  }
});

export default router;
