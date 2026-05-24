import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import rateLimit from "express-rate-limit";

const router = Router();

// Admin actions rate limiter - prevent abuse (mirrors admin.routes.ts)
const adminActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Too many admin actions, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔥 OVERRIDE: मैन्युअल रैंकिंग कंट्रोल
router.patch("/:id/override-dssl", requireAuth, requireSuperAdmin, adminActionLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    const { score } = req.body;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ success: false, error: "DSSL score must be a number between 0 and 100" });
    }

    // 🔐 TENANT ISOLATION: Pre-mutation district ownership validation
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    if (req.ctx?.districtId && req.ctx.districtId !== existingVendor.districtId) {
      return res.status(403).json({ success: false, error: "Cross-district modification denied" });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { dsslScore: score }
    });

    // Log admin action — normalized to adminActionLog
    await prisma.adminActionLog.create({
      data: {
        adminId: req.ctx?.userId || 0,
        action: "DSSL_SCORE_OVERRIDE",
        details: {
          targetId: id,
          targetType: "vendor",
          decision: "DSSL_OVERRIDE",
          reason: `DSSL score manually overridden from ${existingVendor.dsslScore ?? 'N/A'} to ${score} for vendor ${vendor.name}`,
          districtId: vendor.districtId
        }
      }
    });

    return res.json({ success: true, newScore: score });
  } catch (e) {
    console.error("Override DSSL error", e);
    return res.status(500).json({ success: false, error: "Failed to override DSSL score" });
  }
});

// ⭐ SPONSORSHIP TOGGLE: वेंडर को VIP/SPONSORED बनाएं
router.patch("/:id/sponsorship", requireAuth, requireSuperAdmin, adminActionLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    // 🔐 TENANT ISOLATION: Pre-mutation district ownership validation
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    if (req.ctx?.districtId && req.ctx.districtId !== existingVendor.districtId) {
      return res.status(403).json({ success: false, error: "Cross-district modification denied" });
    }

    const { isSponsored, durationDays } = req.body;
    if (typeof isSponsored !== 'boolean') {
      return res.status(400).json({ success: false, error: "isSponsored must be boolean" });
    }

    const now = new Date();
    const days = (typeof durationDays === 'number' && durationDays > 0) ? durationDays : 7;
    const boostedUntil = isSponsored ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;

    let vendor: any = null;
    try {
      vendor = await prisma.vendor.update({ where: { id }, data: { boostedUntil } });
    } catch (prismaErr) {
      console.error("[SPONSORSHIP_PRISMA_ERROR]", prismaErr);
      return res.status(500).json({ success: false, error: "Failed to update vendor sponsorship" });
    }

    const computedIsSponsored = !!(vendor.boostedUntil && new Date(vendor.boostedUntil) > new Date());

    // AUDIT — normalized to adminActionLog
    try {
      await prisma.adminActionLog.create({
        data: {
          adminId: req.ctx?.userId || 0,
          action: "VENDOR_SPONSORSHIP",
          details: {
            targetId: id,
            targetType: "vendor",
            decision: computedIsSponsored ? "SPONSORED" : "UNSPONSORED",
            reason: `${computedIsSponsored ? 'Sponsored' : 'Unsponsored'} vendor ${vendor.name}`,
            districtId: vendor.districtId
          }
        }
      });
    } catch (auditErr) {
      console.warn("[AUDIT_FAIL] adminActionLog write", auditErr);
    }

    // REALTIME emit — fire-and-forget
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`district-${vendor.districtId}`).emit('vendor:update', {
          type: 'SPONSORSHIP_UPDATE',
          vendor: { id: vendor.id, isSponsored: computedIsSponsored }
        });
      }
    } catch (_) { /* non-blocking */ }

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

    return res.status(200).json({ success: true, vendor: safeVendor });
  } catch (err) {
    console.error('[SPONSORSHIP_ERROR]', err);
    return res.status(500).json({ success: false, error: 'Unhandled error in sponsorship handler' });
  }
});

export default router;
