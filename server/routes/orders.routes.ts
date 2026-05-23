import express, { type Request, type Response } from "express";
import { requireAuth } from "../auth/middleware";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { ErrorCode, sendError, sendSuccess } from "../middleware/errorHandler";
import { findProductById } from "../repositories/product.repo";
import { createOrder, findOrders } from "../repositories/order.repo";
import { prisma } from "../storage";
import { MIGRATION_FLAGS, logMigrationEvent, logMigrationWarning, logMigrationError } from "../config/migration";
import { SovereignOrderEngine } from "../services/order.engine";

// Order validation schemas
const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20)
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().regex(/^\+?[\d\s\-\(\)]{10,15}$/),
  customerAddress: z.string().min(10).max(500),
  paymentMethod: z.enum(["cod", "cash", "online", "card"])
});

const router = express.Router();

// ============================================
// 📦 ORDER MANAGEMENT
// ============================================

// --- LEGACY ORDER SYSTEM - READ ONLY ---
// 🚨 MIGRATION CONTROL: Legacy system is now READ-ONLY
// 🚨 New orders must use Sovereign Order Engine
// 🚨 This endpoint will be removed after migration verification

// --- CREATE ORDER (LEGACY/SOVEREIGN ROUTING) ---
router.post("/", requireAuth, validate(createOrderSchema, 'body'), async (req: Request, res: Response) => {
  try {
    const { items, customerName, customerPhone, customerAddress, paymentMethod } = req.body;
    const userId = req.ctx?.userId!;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District required");
    }

    // ============================================
    // MIGRATION CONTROL: Route to appropriate engine
    // ============================================

    // P0 FIX: Sovereign engine with graceful fallback to legacy
    // If sovereign is active AND succeeds → return early (line below)
    // If sovereign fails → fall through to legacy engine
    if (MIGRATION_FLAGS.SOVEREIGN_ENGINE_ACTIVE && !MIGRATION_FLAGS.FORCE_LEGACY_MODE) {
      // 🚀 ROUTE TO SOVEREIGN ORDER ENGINE
      logMigrationEvent('Routing to Sovereign Order Engine', {
        userId,
        districtId,
        itemCount: items.length,
        paymentMethod
      });

      try {
        const sovereignEngine = new SovereignOrderEngine(null); // TODO: Add event publisher
        const result = await sovereignEngine.createOrder({
          userId,
          districtId,
          items,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod: paymentMethod.toUpperCase()
        });

        logMigrationEvent('Sovereign order created successfully', {
          orderId: result.orderId,
          totalAmountPaisa: result.totalAmountPaisa
        });

        return sendSuccess(res, {
          id: result.orderId,
          status: result.status,
          totalAmount: (result.totalAmountPaisa / 100).toFixed(2),
          totalItems: result.totalItems,
          message: "Order created via Sovereign Engine"
        });

      } catch (sovereignError) {
        logMigrationError('Sovereign engine failed, falling back to legacy', sovereignError);

        // P0 FIX: Graceful fallback — do NOT return error, fall through to legacy engine
        // Prevents catastrophic order outage if sovereign engine is unavailable
        logMigrationWarning('Sovereign fallback activated — routing to legacy engine', {
          userId,
          districtId,
          error: sovereignError instanceof Error ? sovereignError.message : 'Unknown error'
        });
      }
      // No return in catch → execution falls through to legacy engine below
    }

    // 📦 LEGACY ORDER ENGINE (DEPRECATED — used as sovereign fallback)
    // P0 FIX: Removed `else` block — legacy now runs as fallback if sovereign fails or if sovereign is inactive
    if (!MIGRATION_FLAGS.SOVEREIGN_ENGINE_ACTIVE || MIGRATION_FLAGS.FORCE_LEGACY_MODE || true) {
      // This always runs: either as primary path (sovereign inactive) or fallback (sovereign failed)
      logMigrationWarning('Routing to Legacy Order Engine (deprecated)', {
        userId,
        districtId,
        reason: MIGRATION_FLAGS.LEGACY_READ_ONLY ? 'read-only mode' : 'feature flag'
      });

      // ============================================
      // LEGACY ORDER PROCESSING (TO BE REMOVED)
      // ============================================

      const strictDistrictId = Number(districtId);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, ErrorCode.BAD_REQUEST, "Order items required");
      }

      const createdOrders = [];

      for (const item of items) {
        // BLOCK NEGATIVE/INVALID QUANTITIES
        if (item.quantity <= 0 || item.quantity > 20) {
          return sendError(res, 400, ErrorCode.BAD_REQUEST, "Invalid quantity");
        }

        // FETCH PRODUCT (LEGACY VALIDATION) — include vendor status for server-side verification
        const product = await prisma.product.findFirst({
          where: { id: item.productId },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                status: true,
                districtId: true
              }
            }
          }
        });

        // Validate product exists
        if (!product) {
          return sendError(res, 400, ErrorCode.BAD_REQUEST, "Product not found");
        }

        // SERVER-SIDE VENDOR VERIFICATION (P0: hardened trust boundary — never trust client-supplied vendorId)
        const resolvedVendorId = product.vendorId;
        const vendorData = product.vendor as any;

        // Validate vendor exists and is not null (safety check for orphaned FKs)
        if (!vendorData) {
          return sendError(res, 400, ErrorCode.BAD_REQUEST, "Vendor record not found for this product");
        }

        // Validate vendor belongs to correct district
        // DOMAIN TRUTH: Product has NO districtId — district ownership is via Vendor → districtId
        if (vendorData.districtId !== strictDistrictId) {
          return sendError(res, 400, ErrorCode.BAD_REQUEST, "Product not available in your district");
        }

        // Validate vendor is approved for selling
        if (vendorData.status !== "APPROVED") {
          return sendError(res, 400, ErrorCode.BAD_REQUEST, "Vendor not approved");
        }

        // LEGACY PRICING (uses server-resolved price)
        const totalPrice = Number(product.price ?? 0) * item.quantity;
        const platformCommission = totalPrice * 0.05;

        // CREATE LEGACY ORDER — uses server-resolved vendorId, NOT client-supplied
        const order = await createOrder({
          userId,
          productId: item.productId,
          vendorId: resolvedVendorId, // FIXED: server-resolved, not client-supplied
          districtId: strictDistrictId,
          quantity: item.quantity,
          totalPrice,
          commission: platformCommission,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod,
          status: "pending"
        });

        createdOrders.push(order);

        // LEGACY INTELLIGENCE UPDATES — uses server-resolved vendorId
        await prisma.vendor.update({
          where: { id: resolvedVendorId },
          data: {
            totalOrders: { increment: 1 },
            aiRankScore: { increment: 1.2 }
          }
        });

        await prisma.product.update({
          where: { id: item.productId },
          data: {
            orderCount: { increment: 1 },
            aiRankScore: { increment: 1.0 },
            conversionScore: { increment: 0.1 }
          }
        });

        const previousOrders = await prisma.order.count({
          where: {
            userId,
            vendorId: resolvedVendorId,
            createdAt: { lt: new Date() }
          }
        });

        if (previousOrders > 0) {
          await prisma.vendor.update({
            where: { id: resolvedVendorId },
            data: { repeatCustomers: { increment: 1 } }
          });
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            orderSource: 'USER_PURCHASE',
            aiInfluenced: false,
            identityVersion: 1
          }
        });
      }

      return sendSuccess(res, createdOrders);
    }

  } catch (err) {
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Order failed");
  }
});

// --- GET USER ORDERS ---
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, ErrorCode.AUTH_REQUIRED, "Unauthorized");
    }

    const userId = req.ctx?.userId!;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District required");
    }
    const strictDistrictId = Number(districtId);

    // Fetch user orders with product details, filtered by district
    const orders = await findOrders(
      { userId: userId, districtId: strictDistrictId },
      {
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          user: true
        }
      }
    );

    return sendSuccess(res, orders);
  } catch (err: any) {
    console.error("Orders fetch error:", err);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, err.message);
  }
});

export default router;
