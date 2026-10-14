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
import { reliableEventPublisher } from "../services/event-delivery-verification";
import { normalizeRole, UserRole } from "../../shared/roles";

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
  paymentMethod: z.enum(["cod", "cash", "online", "card"]),
  deliveryAddressSnapshot: z.any().optional(),
  idempotencyKey: z.string().max(128).optional()
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
    const { items, customerName, customerPhone, customerAddress, paymentMethod, deliveryAddressSnapshot, idempotencyKey } = req.body;
    const userId = req.ctx?.userId!;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District required");
    }

    // 🛡️ GUARD: Reject unsupported payment methods before transaction/inventory/order creation
    if (paymentMethod === "online" || paymentMethod === "card") {
      return sendError(
        res,
        400,
        ErrorCode.BAD_REQUEST,
        "Online payment is currently unavailable. Please select Cash on Delivery (COD)."
      );
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
        const sovereignEngine = new SovereignOrderEngine(reliableEventPublisher);
        const result = await sovereignEngine.createOrder({
          userId,
          districtId,
          items,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod: paymentMethod.toUpperCase(),
          deliveryAddressSnapshot,
          idempotencyKey
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
        logMigrationError('Sovereign engine failed', sovereignError);
        return sendError(
          res,
          400,
          ErrorCode.BAD_REQUEST,
          sovereignError instanceof Error ? sovereignError.message : "Failed to create order"
        );
      }
    }

    // 📦 LEGACY ORDER ENGINE (DEPRECATED — used when sovereign is inactive or forced legacy)
    if (!MIGRATION_FLAGS.SOVEREIGN_ENGINE_ACTIVE || MIGRATION_FLAGS.FORCE_LEGACY_MODE) {
      logMigrationWarning('Routing to Legacy Order Engine (deprecated)', {
        userId,
        districtId,
        reason: MIGRATION_FLAGS.LEGACY_READ_ONLY ? 'read-only mode' : 'feature flag'
      });

      // ============================================
      // LEGACY ORDER PROCESSING (ATOMIC TRANSACTION)
      // ============================================

      const strictDistrictId = Number(districtId);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, ErrorCode.BAD_REQUEST, "Order items required");
      }

      let createdOrders;
      try {
        createdOrders = await prisma.$transaction(async (tx) => {
          // 🛡️ IDEMPOTENCY PROTECTION (CONCURRENCY-SERIALIZED ADVISORY LOCK + JSONB LOOKUP)
          if (idempotencyKey && userId) {
            const lockKey = `ord_${userId}_${idempotencyKey}`;
            // Transaction-scoped lock automatically releases on COMMIT or ROLLBACK
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

            // Check if this logical checkout request was already committed
            const existingOrders = await tx.order.findMany({
              where: {
                userId,
                deliveryAddressSnapshot: {
                  path: ['clientOrderId'],
                  equals: idempotencyKey
                }
              }
            });

            if (existingOrders.length > 0) {
              return existingOrders;
            }
          }

          const orders = [];

          // Preserve clientOrderId across all order rows created from this logical checkout
          const enrichedSnapshot = deliveryAddressSnapshot && typeof deliveryAddressSnapshot === 'object'
            ? { ...deliveryAddressSnapshot, clientOrderId: idempotencyKey || null }
            : (idempotencyKey ? { clientOrderId: idempotencyKey } : deliveryAddressSnapshot);

          // 🛡️ 1. PRE-VALIDATE & AGGREGATE QUANTITIES PER PRODUCT ID (MAX 20 PER PRODUCT PER ORDER)
          const aggregatedQuantities = new Map<number, number>();
          for (const item of items) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 20) {
              throw new Error("Invalid quantity");
            }
            const currentTotal = (aggregatedQuantities.get(item.productId) || 0) + item.quantity;
            if (currentTotal > 20) {
              throw new Error("Maximum allowed quantity for any single product is 20 units");
            }
            aggregatedQuantities.set(item.productId, currentTotal);
          }

          // 🛡️ 2. ATOMIC CONDITIONAL STOCK DECREMENT (CONCURRENCY-SAFE)
          for (const [productId, requiredQty] of aggregatedQuantities.entries()) {
            const decrementResult = await tx.product.updateMany({
              where: {
                id: productId,
                stock: { gte: requiredQty }
              },
              data: {
                stock: { decrement: requiredQty }
              }
            });

            if (decrementResult.count === 0) {
              const productCheck = await tx.product.findUnique({
                where: { id: productId },
                select: { title: true, stock: true }
              });

              if (!productCheck) {
                throw new Error("Product not found");
              }

              throw new Error(`Insufficient stock for ${productCheck.title || 'product'}`);
            }
          }

          for (const item of items) {
            // FETCH PRODUCT (LEGACY VALIDATION) — include vendor status for server-side verification
            const product = await tx.product.findFirst({
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
              throw new Error("Product not found");
            }

            // SERVER-SIDE VENDOR VERIFICATION (P0: hardened trust boundary — never trust client-supplied vendorId)
            const resolvedVendorId = product.vendorId;
            const vendorData = product.vendor as any;

            // Validate vendor exists and is not null (safety check for orphaned FKs)
            if (!vendorData) {
              throw new Error("Vendor record not found for this product");
            }

            // Validate vendor belongs to correct district
            // DOMAIN TRUTH: Product has NO districtId — district ownership is via Vendor → districtId
            if (vendorData.districtId !== strictDistrictId) {
              throw new Error("Product not available in your district");
            }

            // Validate vendor is approved for selling
            if (vendorData.status !== "APPROVED") {
              throw new Error("Vendor not approved");
            }

            // LEGACY PRICING (uses server-resolved price)
            const totalPrice = Number(product.price ?? 0) * item.quantity;

            // CREATE LEGACY ORDER — uses server-resolved vendorId, NOT client-supplied
            const order = await tx.order.create({
              data: {
                userId,
                productId: item.productId,
                vendorId: resolvedVendorId,
                districtId: strictDistrictId,
                quantity: item.quantity,
                totalPrice,
                customerName,
                customerPhone,
                customerAddress,
                deliveryAddressSnapshot: enrichedSnapshot,
                paymentMethod,
                status: "pending"
              }
            });

            orders.push(order);

            // LEGACY INTELLIGENCE UPDATES — uses server-resolved vendorId
            await tx.vendor.update({
              where: { id: resolvedVendorId },
              data: {
                aiRankScore: { increment: 1.2 }
              }
            });
          }

          return orders;
        });
      } catch (txError: any) {
        return sendError(
          res,
          400,
          ErrorCode.BAD_REQUEST,
          txError?.message || "Order failed"
        );
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

    // Construct authoritative timelines from the AuditLog ledger for each order
    const ordersWithTimeline = await Promise.all(orders.map(async (order) => {
      const logs = await prisma.auditLog.findMany({
        where: {
          entityId: order.id,
          entityType: { in: ['ORDER', 'SOVEREIGN_ORDER'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      const timelineEvents: Record<string, string> = {};
      let cancelledAt: string | null = null;
      let cancelledReason: string | null = null;

      // Seed pending milestone from the order's creation timestamp
      timelineEvents['pending'] = order.createdAt.toISOString();

      for (const log of logs) {
        if (log.action === 'ORDER_CREATED') {
          timelineEvents['pending'] = log.createdAt.toISOString();
        } else if (log.action === 'ORDER_STATUS_CHANGED') {
          const meta = log.metadata as any;
          const status = (meta?.newStatus || meta?.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'rejected') {
            cancelledAt = log.createdAt.toISOString();
            cancelledReason = typeof log.details === 'string' ? log.details : (log.details ? JSON.stringify(log.details) : 'Order was cancelled.');
          } else if (status) {
            timelineEvents[status] = log.createdAt.toISOString();
          }
        }
      }

      // Canonical status mappings
      if (timelineEvents['confirmed'] && !timelineEvents['accepted']) {
        timelineEvents['accepted'] = timelineEvents['confirmed'];
      }
      if (timelineEvents['accepted'] && !timelineEvents['confirmed']) {
        timelineEvents['confirmed'] = timelineEvents['accepted'];
      }
      const readyTime = timelineEvents['ready'] || timelineEvents['shipped'] || timelineEvents['out_for_delivery'];
      if (readyTime) {
        timelineEvents['ready'] = readyTime;
      }
      const deliveredTime = timelineEvents['delivered'] || timelineEvents['completed'];
      if (deliveredTime) {
        timelineEvents['delivered'] = deliveredTime;
      }

      const stagesKeys = ['pending', 'accepted', 'preparing', 'ready', 'delivered'];
      const stagesLabels: Record<string, string> = {
        pending: "ऑर्डर प्राप्त",
        accepted: "विक्रेता द्वारा स्वीकार",
        preparing: "तैयार किया जा रहा है",
        ready: "डिलीवरी हेतु तैयार",
        delivered: "सफलतापूर्वक वितरित"
      };

      const stages = stagesKeys.map((key, index) => {
        const timestamp = timelineEvents[key] || null;
        let completed = !!timestamp;

        // Propagate completion chronologically if a subsequent stage is reached
        if (!completed) {
          for (let i = index + 1; i < stagesKeys.length; i++) {
            if (timelineEvents[stagesKeys[i]]) {
              completed = true;
              break;
            }
          }
        }

        return {
          key,
          label: stagesLabels[key],
          timestamp,
          completed
        };
      });

      return {
        ...order,
        timeline: {
          currentStatus: order.status,
          stages,
          cancelledAt,
          cancelledReason
        }
      };
    }));

    return sendSuccess(res, ordersWithTimeline);
  } catch (err: any) {
    console.error("Orders fetch error:", err);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, err.message);
  }
});

// --- GET ORDER STATUS (P1-C: Payment & Order Status Polling) ---
router.get("/:orderId/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const orderIdParam = req.params.orderId;
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId) || orderId <= 0 || String(orderId) !== orderIdParam.trim()) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, "Invalid order ID");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        vendorId: true,
        districtId: true,
        quantity: true,
        totalPrice: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      }
    });

    if (!order) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, "Order not found");
    }

    // Resolve canonical identity and authority from req.ctx
    const userId = req.ctx?.userId;
    const normalizedRole = normalizeRole(req.ctx?.role);
    const userDistrictId = req.ctx?.districtId ?? req.districtId;

    const isSuperAdmin = normalizedRole === UserRole.SUPER_ADMIN;

    // Cross-district isolation for non-Super-Admin
    if (!isSuperAdmin && userDistrictId != null && order.districtId != null && Number(order.districtId) !== Number(userDistrictId)) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, "Access denied to order status");
    }

    // 1. Order Owner (Customer who placed the order)
    const isOrderOwner = order.userId != null && userId != null && Number(order.userId) === Number(userId);

    // 2. City Admin (Restricted to authorized district)
    const isCityAdmin = normalizedRole === UserRole.CITY_ADMIN &&
      userDistrictId != null &&
      order.districtId != null &&
      Number(order.districtId) === Number(userDistrictId);

    // 3. Vendor Owner (Merchant owning the vendor associated with this order)
    let isVendorOwner = false;
    if (order.vendorId != null && (normalizedRole === UserRole.MERCHANT || req.ctx?.role === "VENDOR" || req.ctx?.role === "MERCHANT")) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: order.vendorId,
          OR: [
            ...(userId ? [{ userId: Number(userId) }] : []),
            ...(req.user?.username ? [{ slug: req.user.username }] : [])
          ]
        },
        select: { id: true, districtId: true }
      });
      if (vendor) {
        if (!isSuperAdmin && userDistrictId != null && vendor.districtId != null && Number(vendor.districtId) !== Number(userDistrictId)) {
          isVendorOwner = false;
        } else {
          isVendorOwner = true;
        }
      }
    }

    if (!isSuperAdmin && !isOrderOwner && !isCityAdmin && !isVendorOwner) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, "Access denied to order status");
    }

    // Return minimal, non-sensitive status payload matching PaymentOrderStatus contract
    return sendSuccess(res, {
      id: String(order.id),
      status: order.status,
      total: Number(order.totalPrice),
      items: order.quantity,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Order status fetch error:", err);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to fetch order status");
  }
});

export default router;
