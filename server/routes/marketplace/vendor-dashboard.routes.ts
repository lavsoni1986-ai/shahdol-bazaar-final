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

// 🛡️ Helper to resolve authenticated vendor with district isolation
async function resolveAuthVendor(req: any) {
  const districtId = req.ctx?.districtId;
  const userId = req.ctx?.userId;
  const username = req.user?.username;

  if (!districtId || (!userId && !username)) return null;

  return prisma.vendor.findFirst({
    where: {
      districtId,
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(username ? [{ slug: username }] : [])
      ]
    },
    include: {
      doctors: true
    }
  });
}

// 🛡️ SOVEREIGN API: Vendor stats endpoint
router.get("/vendor/stats", requireAuth, async (req, res) => {
  try {
    const districtId = (req as any).ctx?.districtId;
    if (!districtId) return failure(res, "DISTRICT_REQUIRED", "District context required", 400);

    const vendor = await resolveAuthVendor(req);

    if (!vendor) {
      console.log(`⚠️ [VENDOR DASHBOARD] No vendor found for user in district=${districtId}`);
      return res.json({
        success: true,
        data: {
          vendorIncomplete: true,
          message: "Vendor profile setup incomplete."
        }
      });
    }

    const [orders, revenue, products, inquiries, appointments] = await Promise.all([
      prisma.order.count({
        where: { vendorId: vendor.id }
      }),

      prisma.order.aggregate({
        where: { vendorId: vendor.id, status: "COMPLETED" },
        _sum: { totalPrice: true }
      }),

      prisma.product.count({
        where: { vendorId: vendor.id }
      }),

      prisma.inquiry.count({
        where: { vendorId: vendor.id }
      }),

      prisma.shopAppointment.count({
        where: { shopId: vendor.id }
      })
    ]);

    return res.json({
      success: true,
      data: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        slug: vendor.slug,
        businessType: vendor.businessType,
        category: vendor.category,
        isHospital: vendor.isHospital,
        specialties: vendor.specialties || [],
        serviceArea: vendor.serviceArea || "",
        serviceHours: vendor.serviceHours || "",
        description: vendor.description || "",
        phone: vendor.phone || vendor.mobile || "",
        address: vendor.address || "",
        totalOrders: orders,
        totalRevenue: revenue._sum.totalPrice || 0,
        totalProducts: products,
        totalDoctors: vendor.doctors?.length || 0,
        totalInquiries: inquiries,
        totalAppointments: appointments,
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

// 🛡️ SOVEREIGN API: Vendor profile endpoint
router.get("/vendor/profile", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    return res.json({ success: true, data: vendor });
  } catch (err) {
    console.error("Vendor profile fetch error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch vendor profile");
  }
});

router.patch("/vendor/profile", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const { specialties, serviceArea, serviceHours, description, phone, mobile, address } = req.body;

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(Array.isArray(specialties) ? { specialties } : {}),
        ...(typeof serviceArea === "string" ? { serviceArea } : {}),
        ...(typeof serviceHours === "string" ? { serviceHours } : {}),
        ...(typeof description === "string" ? { description } : {}),
        ...(typeof phone === "string" ? { phone } : {}),
        ...(typeof mobile === "string" ? { mobile } : {}),
        ...(typeof address === "string" ? { address } : {})
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Vendor profile update error:", err);
    return failure(res, "SERVER_ERROR", "Failed to update vendor profile");
  }
});

// 🏥 SOVEREIGN API: Doctor Management for Healthcare Vendors
router.get("/vendor/doctors", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const doctors = await prisma.doctor.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: doctors });
  } catch (err) {
    console.error("Doctor list error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch doctors");
  }
});

router.post("/vendor/doctors", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const { name, qualification, specialization, experience, consultationFee, timing, image } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return failure(res, "VALIDATION_ERROR", "Doctor name is required", 400);
    }

    const doctor = await prisma.doctor.create({
      data: {
        name: name.trim(),
        qualification: qualification ? String(qualification).trim() : null,
        specialization: specialization ? String(specialization).trim() : null,
        experience: Number(experience) || 0,
        consultationFee: Number(consultationFee) || 0,
        timing: timing ? String(timing).trim() : null,
        image: image ? String(image).trim() : null,
        vendorId: vendor.id
      }
    });

    return res.status(201).json({ success: true, data: doctor });
  } catch (err) {
    console.error("Doctor create error:", err);
    return failure(res, "SERVER_ERROR", "Failed to create doctor");
  }
});

router.delete("/vendor/doctors/:id", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const doctorId = req.params.id;
    const existing = await prisma.doctor.findFirst({
      where: { id: doctorId, vendorId: vendor.id }
    });

    if (!existing) {
      return failure(res, "NOT_FOUND", "Doctor not found or not owned by vendor", 404);
    }

    await prisma.doctor.delete({ where: { id: doctorId } });
    return res.json({ success: true, message: "Doctor deleted successfully" });
  } catch (err) {
    console.error("Doctor delete error:", err);
    return failure(res, "SERVER_ERROR", "Failed to delete doctor");
  }
});

// 📋 SOVEREIGN API: Inquiries & Appointments for Service/Healthcare Vendors
router.get("/vendor/inquiries", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const inquiries = await prisma.inquiry.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: inquiries });
  } catch (err) {
    console.error("Inquiries fetch error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch inquiries");
  }
});

router.get("/vendor/appointments", requireAuth, async (req, res) => {
  try {
    const vendor = await resolveAuthVendor(req);
    if (!vendor) return failure(res, "NOT_FOUND", "Vendor profile not found", 404);

    const appointments = await prisma.shopAppointment.findMany({
      where: { shopId: vendor.id },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: appointments });
  } catch (err) {
    console.error("Appointments fetch error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch appointments");
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
