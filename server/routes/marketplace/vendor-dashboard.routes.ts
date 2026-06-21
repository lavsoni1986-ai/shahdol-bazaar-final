import { Router } from "express";
import { prisma } from "../../storage";
import { requireAuth } from "../../auth/middleware";
import { reliableEventPublisher } from "../../services/event-delivery-verification";

const router = Router();

const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: { code, message, details }
  });

// 🛡️ SOVEREIGN API: Vendor stats endpoint
router.get("/vendor/stats", requireAuth, async (req, res) => {
  try {
    const districtId = (req as any).ctx?.districtId;
    if (!districtId) return failure(res, "DISTRICT_REQUIRED", "District context required", 400);

    const username = (req as any).user?.username as string | undefined;
    if (!username) return failure(res, "AUTH_ERROR", "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
      where: { districtId, slug: username }
    });

    if (!vendor) {
      console.log(`⚠️ [VENDOR DASHBOARD] No vendor found for user=${username} district=${districtId}`);
      // Graceful onboarding response: do not return generic 404 to frontend
      return res.json({
        success: true,
        data: {
          vendorIncomplete: true,
          message: "Vendor profile setup incomplete."
        }
      });
    }

    const [orders, revenue, products] = await Promise.all([
      prisma.order.count({
        where: { vendorId: vendor.id }
      }),

      prisma.order.aggregate({
        where: { vendorId: vendor.id, status: "COMPLETED" },
        _sum: { totalPrice: true }
      }),

      prisma.product.count({
        where: { vendorId: vendor.id }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalOrders: orders,
        totalRevenue: revenue._sum.totalPrice || 0,
        totalProducts: products,
        dsslScore: vendor.dsslScore,
        rating: vendor.rating || 0,
        isVerified: vendor.isVerified
      }
    });
  } catch (err) {
    console.error("Vendor stats error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor stats");
  }
});

// 🛡️ SOVEREIGN API: Secure vendor orders endpoint
router.get("/vendor/orders", requireAuth, async (req, res) => {
  try {
    const districtId = (req as any).ctx?.districtId;
    if (!districtId) return failure(res, "DISTRICT_REQUIRED", "District context required", 400);

    const userId = (req as any).ctx?.userId;
    if (!userId) return failure(res, "AUTH_ERROR", "Unauthorized");

    // 1. Fetch vendor owned by authenticated user in this district
    const vendor = await prisma.vendor.findFirst({
      where: { districtId, userId }
    });

    if (!vendor) {
      console.log(`⚠️ [VENDOR ORDERS] No vendor found for user=${userId} district=${districtId}`);
      return res.json({ success: true, data: [] });
    }

    // 2. Fetch orders belonging to this vendor
    const orders = await prisma.order.findMany({
      where: { 
        vendorId: vendor.id, 
        districtId 
      },
      include: {
        product: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 🛡️ BHARATOS SECURITY GUARANTEE: Invariant check (redundant but critical for isolation audit)
    const secureOrders = orders.filter(o => o.vendorId === vendor.id && o.districtId === districtId);

    return res.json({ success: true, data: secureOrders });
  } catch (err) {
    console.error("Vendor orders error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor orders");
  }
});

// 🛡️ SOVEREIGN API: Secure vendor order FSM transition endpoint
router.patch("/vendor/orders/:orderId/status", requireAuth, async (req, res) => {
  try {
    const districtId = (req as any).ctx?.districtId;
    if (!districtId) return res.status(403).json({ success: false, error: "District context required" });

    const userId = (req as any).ctx?.userId;
    if (!userId) return res.status(403).json({ success: false, error: "Unauthorized" });

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: "Status required" });
    }

    const targetStatus = String(status).toLowerCase();

    // 1. Resolve vendor
    const vendor = await prisma.vendor.findFirst({
      where: { districtId, userId }
    });
    if (!vendor) {
      return res.status(403).json({ success: false, error: "Vendor profile not found" });
    }

    // 2. Resolve order
    const orderId = Number(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, error: "Invalid order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // 3. Security Invariants Verification
    if (order.vendorId !== vendor.id || order.districtId !== districtId) {
      return res.status(403).json({ success: false, error: "Forbidden: Cross-vendor or cross-district operations are prohibited" });
    }

    // 4. Validate FSM transitions
    const currentStatus = String(order.status).toLowerCase();
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      pending: ["accepted", "cancelled"],
      accepted: ["preparing", "cancelled"],
      preparing: ["ready"],
      ready: ["delivered"],
      delivered: [],
      cancelled: []
    };

    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid transition: Cannot move order status from '${currentStatus}' to '${targetStatus}'` 
      });
    }

    // 5. Update order status and write to Audit Trail cryptographically
    const previousStatus = order.status;

    // Cryptographic audit chain link
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true }
    });

    const auditData = JSON.stringify({
      action: 'ORDER_STATUS_CHANGED',
      userId: userId,
      targetId: orderId,
      targetType: 'ORDER',
      details: `Order #${orderId} status changed from ${previousStatus} to ${targetStatus}`,
      metadata: {
        orderId,
        vendorId: vendor.id,
        previousStatus,
        newStatus: targetStatus,
        changedByUserId: userId,
        districtId,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || 'system',
      userAgent: req.get('User-Agent') || 'vendor-dashboard',
      districtId: districtId,
      timestamp: new Date().toISOString()
    });

    const crypto = await import('crypto');
    const currentHash = crypto.default.createHash('sha256')
      .update((lastEntry?.hash || 'GENESIS') + auditData)
      .digest('hex');

    // Run update in single transaction boundary
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Create immutable audit trail
      await tx.auditLog.create({
        data: {
          action: 'ORDER_STATUS_CHANGED',
          userId: userId,
          entityType: 'ORDER',
          entityId: orderId,
          targetId: orderId,
          targetType: 'ORDER',
          details: `Order #${orderId} status changed from ${previousStatus} to ${targetStatus}`,
          metadata: {
            orderId,
            vendorId: vendor.id,
            previousStatus,
            newStatus: targetStatus,
            changedByUserId: userId,
            districtId,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || 'system',
          userAgent: req.get('User-Agent') || 'vendor-dashboard',
          districtId: districtId,
          hash: currentHash,
          prevHash: lastEntry?.hash || null
        }
      });

      // Perform state update
      return await tx.order.update({
        where: { id: orderId },
        data: { status: targetStatus }
      });
    });

    console.log(`✅ [ORDER FSM] Order #${orderId} status updated to '${targetStatus}' by userId ${userId}`);

    // 🔔 Fire FSM Status Changed Event (Non-blocking, Observer Pattern)
    void reliableEventPublisher.publishOrderStatusChanged(orderId, districtId, targetStatus)
      .catch(publishErr => {
        console.error(`⚠️ [ORDER FSM] Failed to publish order status event for Order #${orderId}:`, publishErr);
      });

    return res.json({ success: true, data: updatedOrder });
  } catch (err) {
    console.error("Order FSM status update failed:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
