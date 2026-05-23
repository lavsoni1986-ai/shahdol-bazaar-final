import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { emitVendorUpdate } from "../../lib/realtime";

const router = Router();

// ✅ APPROVE: वेंडर को मार्केटप्लेस में लाइव करें
// P0 FIX: Added district validation, fixed audit log action from VENDOR_BAN to VENDOR_APPROVED,
// fixed audit log details, normalized response contract, added real-time emit safety.
router.patch("/:id/approve", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    // District validation
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    // SUPER_ADMIN bypasses district check, but if districtId present, validate
    if (req.user?.districtId && req.user.districtId !== existingVendor.districtId) {
      return res.status(403).json({ success: false, error: "Cross-district access denied" });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { status: "APPROVED", isVerified: true, isShadowBanned: false }
    });

    // 🔥 REAL-TIME SYNC (fire-and-forget - never block response)
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`district-${vendor.districtId}`).emit('vendor:update', {
          type: 'APPROVED',
          vendor: { id: vendor.id, status: vendor.status, isVerified: vendor.isVerified }
        });
      }
    } catch (_) { /* non-blocking */ }

    try { emitVendorUpdate(vendor); } catch (_) { /* non-blocking */ }

    // Log admin action — FIXED: action is VENDOR_APPROVED, not VENDOR_BAN
    await prisma.adminLog.create({
      data: {
        adminId: req.ctx?.userId || 0,
        action: "VENDOR_APPROVED",
        targetId: id,
        details: `Approved vendor ${vendor.name} - status set to APPROVED`
      }
    });

    return res.json({ success: true, data: vendor });
  } catch (e) {
    console.error("Vendor approve error", e);
    return res.status(500).json({ success: false, error: "Failed to approve vendor" });
  }
});

// ❌ BAN: 'Shadow Ban' लॉजिक (Status=REJECTED, Score=0)
router.patch("/:id/ban", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status: "REJECTED", dsslScore: 0 }
  });

  // 🔥 REAL-TIME SYNC: Emit vendor update
  const io = (global as any).io;
  io.to(`district-${vendor.districtId}`).emit('vendor:update', {
    type: 'BANNED',
    vendor: { id: vendor.id, status: vendor.status, dsslScore: vendor.dsslScore }
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: req.ctx?.userId || 0,
      action: "VENDOR_BAN",
      targetId: id,
      details: `Banned vendor ${vendor.name} - Shadow ban with score 0`
    }
  });

  res.json({ success: true, data: { message: "Vendor Banned from Sovereign List" } });
});

// 🔥 OVERRIDE: मैन्युअल रैंकिंग कंट्रोल
router.patch("/:id/override-dssl", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const { score } = req.body;
  const oldVendor = await prisma.vendor.findUnique({ where: { id: parseInt(req.params.id) } });
  const vendor = await prisma.vendor.update({
    where: { id: parseInt(req.params.id) },
    data: { dsslScore: score }
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: req.ctx?.userId || 0,
      action: "VENDOR_BAN",
      targetId: parseInt(req.params.id),
      details: `Banned vendor ${vendor.name} - Shadow ban with score 0`
    }
  });

  res.json({ success: true, newScore: score });
});

// ⭐ SPONSORSHIP TOGGLE: वेंडर को VIP/SPONSORED बनाएं
router.patch("/:id/sponsorship", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  console.log("[HANDLER_ENTER] /admin/vendors/:id/sponsorship", { path: req.path, method: req.method });
  try {
    const id = parseInt(req.params.id);
    console.log("[BODY_PARSED] rawBody", { body: req.body });
    if (isNaN(id)) {
      console.log("[HANDLER_ERROR] invalid id", { id });
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    const { isSponsored, durationDays } = req.body;

    if (typeof isSponsored !== 'boolean') {
      console.log("[HANDLER_ERROR] invalid payload isSponsored missing or not boolean", { isSponsored });
      return res.status(400).json({ success: false, error: "isSponsored must be boolean" });
    }

    // Map sponsorship boolean to canonical boostedUntil (no schema change)
    const now = new Date();
    const days = (typeof durationDays === 'number' && durationDays > 0) ? durationDays : 7; // default 7 days
    const boostedUntil = isSponsored ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;

    // PRISMA UPDATE with timeout protection
    console.log("[PRISMA_UPDATE_START]", { id, boostedUntil });
    const prismaTimeoutMs = 5000;
    let vendor: any = null;
    try {
      const updatePromise = prisma.vendor.update({ where: { id }, data: { boostedUntil } });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('PRISMA_UPDATE_TIMEOUT')), prismaTimeoutMs));
      const start = Date.now();
      vendor = await Promise.race([updatePromise, timeoutPromise]);
      const duration = Date.now() - start;
      console.log("[PRISMA_UPDATE_SUCCESS]", { id, durationMs: duration });
    } catch (prismaErr) {
      console.error("[PRISMA_UPDATE_ERROR]", prismaErr);
      console.log("[HANDLER_ERROR] prisma update failed", { error: prismaErr?.message || prismaErr });
      return res.status(500).json({ success: false, error: "Failed to update vendor sponsorship" });
    }

    // Derived compatibility boolean
    const computedIsSponsored = !!(vendor.boostedUntil && new Date(vendor.boostedUntil) > new Date());

    // AUDIT (non-blocking to response? we'll attempt and log)
    console.log("[AUDIT_START]", { adminId: req.ctx?.userId || null, targetId: id });
    try {
      await prisma.adminLog.create({
        data: {
          adminId: req.ctx?.userId || 0,
          action: "VENDOR_SPONSORSHIP",
          targetId: id,
          details: `${computedIsSponsored ? 'Sponsored' : 'Unsponsored'} vendor ${vendor.name}`
        }
      });
      console.log("[AUDIT_SUCCESS]");
    } catch (auditErr) {
      console.warn("[AUDIT_ERROR] failed to write adminLog", auditErr);
    }

    // REALTIME emit - must never block response
    console.log("[REALTIME_START]");
    try {
      const io = (global as any).io;
      // fire and forget
      try {
        io?.to(`district-${vendor.districtId}`).emit('vendor:update', {
          type: 'SPONSORSHIP_UPDATE',
          vendor: { id: vendor.id, isSponsored: computedIsSponsored }
        });
        console.log("[REALTIME_SUCCESS]");
      } catch (emitErrInner) {
        console.warn('[REALTIME_WARN] emit failed synchronously', emitErrInner);
      }
    } catch (realErr) {
      console.warn('[REALTIME_ERROR]', realErr);
    }

    // Build safeVendor DTO
    const safeVendor = {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      districtId: vendor.districtId,
      status: vendor.status,
      isVerified: vendor.isVerified,
      boostedUntil: vendor.boostedUntil || null,
      isSponsored: computedIsSponsored,
      dsslScore: (vendor as any).dsslScore ?? null,
      updatedAt: vendor.updatedAt
    };

    console.log('[RESPONSE_SENT]', { vendorId: id, isSponsored: computedIsSponsored });
    return res.status(200).json({ success: true, vendor: safeVendor });
  } catch (err) {
    console.error('[HANDLER_ERROR]', err);
    return res.status(500).json({ success: false, error: 'Unhandled error in sponsorship handler' });
  }
});



export default router;
