import express, { type Request, type Response } from "express";
import { prisma } from "../../storage";
import { findVendorsByCategory, countVendorsByDistrict, countVendorsByCategory, findVendorBySlug } from "../../repositories/vendor.repo";
import { mapVendorByType } from "../../dto/entity.dto";
import { countActiveProductsByDistrict } from "../../repositories/product.repo";
import { ErrorCode, sendError, sendSuccess } from "../../middleware/errorHandler";
import logger from "../../middleware/logger";

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
router.post("/leads", async (req: Request, res: Response) => {
  try {
    const { source, action, itemId, itemName, category, searchTerm, productId, vendorId, districtId, shopId, shopName, customerName, customerPhone, message } = req.body;
    const userId = req.ctx?.userId || null;

    // Build message from available info (combine extra data into message field)
    let combinedMessage = message || "";
    if (itemName) {
      combinedMessage += (combinedMessage ? " | " : "") + `Item: ${itemName}`;
    }
    if (itemId || productId) {
      combinedMessage += (combinedMessage ? " | " : "") + `ID: ${itemId || productId}`;
    }
    if (category) {
      combinedMessage += (combinedMessage ? " | " : "") + `Category: ${category}`;
    }
    if (searchTerm) {
      combinedMessage += (combinedMessage ? " | " : "") + `Search: ${searchTerm}`;
    }

    // Create lead record in database (only using schema fields)
    const lead = await prisma.lead.create({
      data: {
        source: source || "WHATSAPP_INQUIRY",
        action: action || "click",
        shopId: shopId ? parseInt(shopId) : null,
        shopName: shopName || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        message: combinedMessage || null,
        metadata: { productId, vendorId, districtId, userId },
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

  return sendSuccess(res, hospitals.map(mapVendorByType));
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

// ==========================================
// 🚌 GET LIVE BUS TIMETABLE (STRICT SOVEREIGN MODE - PAGINATED)
// ==========================================
router.get("/bus-timetable", async (req: Request, res: Response) => {
  try {
    if (!req.districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context required");
    }
    const districtId = Number(req.districtId);
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
    const skip = (page - 1) * limit;

    console.log("🚌 BUS TIMETABLE: districtId =", districtId, "page =", page);

    const [buses, total] = await Promise.all([
      prisma.busTimetable.findMany({
        where: { districtId: districtId, isActive: true },
        skip,
        take: limit,
        orderBy: { firstBusTime: 'asc' }
      }),
      prisma.busTimetable.count({ where: { districtId: districtId, isActive: true } })
    ]);

    const mappedBuses = buses.map(bus => ({
      id: bus.id,
      fromCity: bus.fromCity,
      toCity: bus.toCity,
      time: bus.firstBusTime,
      price: bus.fare.replace('₹', ''),
      type: bus.busType,
      routeDescription: bus.travelTime || bus.publicNote || 'Main Highway'
    }));

    return sendSuccess(res, mappedBuses);
  } catch (e: any) {
    console.error("🚨 Bus timetable fetch error:", e.message);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to fetch bus timetable");
  }
});

export default router;
