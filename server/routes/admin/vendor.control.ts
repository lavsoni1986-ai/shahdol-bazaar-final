import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { emitVendorUpdate } from "../../lib/realtime";

const router = Router();

// ✅ APPROVE: वेंडर को मार्केटप्लेस में लाइव करें
router.patch("/:id/approve", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status: "APPROVED", isVerified: true }
  });

  // 🔥 REAL-TIME SYNC: Emit vendor update
  const io = (global as any).io;
  io.to(`district-${vendor.districtId}`).emit('vendor:update', {
    type: 'APPROVED',
    vendor: { id: vendor.id, status: vendor.status, isVerified: vendor.isVerified }
  });

  // 🔥 REAL-TIME: Emit vendor update
  emitVendorUpdate(vendor);

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: req.ctx?.userId || 0,
      action: "VENDOR_BAN",
      targetId: id,
      details: `Banned vendor ${vendor.name} - Shadow ban with score 0`
    }
  });

  res.json({ success: true, vendor });
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
  const id = parseInt(req.params.id);
  const { isSponsored } = req.body;

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { isSponsored }
  });

  // 🔥 REAL-TIME SYNC: Emit vendor update
  const io = (global as any).io;
  io.to(`district-${vendor.districtId}`).emit('vendor:update', {
    type: 'SPONSORSHIP_UPDATE',
    vendor: { id: vendor.id, isSponsored: vendor.isSponsored }
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId: req.ctx?.userId || 0,
      action: "VENDOR_SPONSORSHIP",
      targetId: id,
      details: `${isSponsored ? 'Sponsored' : 'Unsponsored'} vendor ${vendor.name}`
    }
  });

  res.json({ success: true, vendor });
});

export default router;
