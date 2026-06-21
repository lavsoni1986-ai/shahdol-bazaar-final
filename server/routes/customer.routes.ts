import { Router, type Request, type Response } from "express";
import { prisma } from "../storage";
import { requireAuth } from "../auth/middleware";
import crypto from "crypto";

const router = Router();

// Audit log helper function
async function logCustomerAuditEvent(
  req: Request,
  action: string,
  targetId: number,
  targetType: string,
  details: string,
  metadata?: any
) {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      console.warn("⚠️ [AUDIT] Missing userId or districtId for customer audit log");
      return;
    }

    // Get the last audit entry to maintain the cryptographic hash chain
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true }
    });

    const prevHash = lastEntry?.hash || "GENESIS";
    const auditData = JSON.stringify({
      action,
      userId,
      targetId,
      targetType,
      details,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      districtId,
      timestamp: new Date().toISOString()
    });

    const hash = crypto.createHash("sha256")
      .update(prevHash + auditData)
      .digest("hex");

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        entityType: targetType,
        entityId: targetId,
        targetId,
        targetType,
        details,
        metadata: metadata || {},
        ipAddress: req.ip || "unknown",
        userAgent: req.get('User-Agent') || "unknown",
        districtId,
        hash,
        prevHash
      }
    });
    console.log(`📡 [AUDIT] Logged customer audit event: ${action} for user ${userId}`);
  } catch (error) {
    console.error("❌ [AUDIT] Failed to write customer audit log:", error);
  }
}

// ----------------------------------------------------
// TASK 4: CUSTOMER PROFILE API
// ----------------------------------------------------

// GET /api/customer/profile
router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const profile = await prisma.customerProfile.findUnique({
      where: { userId }
    });

    return res.status(200).json({
      success: true,
      data: profile || null
    });
  } catch (err: any) {
    console.error("❌ [CUSTOMER PROFILE] Fetch failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch profile" }
    });
  }
});

// PATCH /api/customer/profile
router.patch("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { fullName, phone } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "fullName and phone are required" }
      });
    }

    const existingProfile = await prisma.customerProfile.findUnique({
      where: { userId }
    });

    let profile;
    let action: string;

    if (!existingProfile) {
      profile = await prisma.customerProfile.create({
        data: {
          userId,
          districtId,
          fullName,
          phone
        }
      });
      action = "CUSTOMER_PROFILE_CREATED";
    } else {
      profile = await prisma.customerProfile.update({
        where: { userId },
        data: {
          fullName,
          phone
        }
      });
      action = "CUSTOMER_PROFILE_UPDATED";
    }

    // Write audit log
    await logCustomerAuditEvent(req, action, profile.id, "CustomerProfile", `Profile name=${fullName}, phone=${phone}`, { fullName, phone });

    // Also update User model consent_given and consent_at
    await prisma.user.update({
      where: { id: userId },
      data: {
        consentGiven: true,
        consentAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err: any) {
    console.error("❌ [CUSTOMER PROFILE] Update failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to update profile" }
    });
  }
});

// ----------------------------------------------------
// TASK 5 & 6: ADDRESS API & DEFAULT ADDRESS INVARIANT
// ----------------------------------------------------

// GET /api/customer/addresses
router.get("/addresses", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const addresses = await prisma.address.findMany({
      where: { userId, districtId },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (err: any) {
    console.error("❌ [ADDRESSES] Fetch failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch addresses" }
    });
  }
});

// POST /api/customer/addresses
router.post("/addresses", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const {
      streetAddress,
      houseNumber,
      landmark,
      village,
      ward,
      city,
      districtName,
      state,
      postalCode,
      type,
      isDefault
    } = req.body;

    if (!streetAddress) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "streetAddress is required" }
      });
    }

    const resolvedType = type || "DELIVERY";

    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        // Clear other defaults for this user and district
        await tx.address.updateMany({
          where: { userId, districtId, isDefault: true },
          data: { isDefault: false }
        });
      }

      return tx.address.create({
        data: {
          userId,
          districtId,
          streetAddress,
          houseNumber: houseNumber || null,
          landmark: landmark || null,
          village: village || null,
          ward: ward || null,
          city: city || null,
          districtName: districtName || null,
          state: state || null,
          postalCode: postalCode || null,
          type: resolvedType,
          isDefault: !!isDefault
        }
      });
    });

    // Write Audit Logs
    await logCustomerAuditEvent(req, "ADDRESS_CREATED", address.id, "Address", `Created address: ${streetAddress}`, address);
    if (isDefault) {
      await logCustomerAuditEvent(req, "ADDRESS_DEFAULT_CHANGED", address.id, "Address", `Set address ${address.id} as default`, { addressId: address.id });
    }

    return res.status(201).json({
      success: true,
      data: address
    });
  } catch (err: any) {
    console.error("❌ [ADDRESSES] Creation failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to create address" }
    });
  }
});

// PATCH /api/customer/addresses/:id
router.patch("/addresses/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const addressId = parseInt(req.params.id);
    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid address ID" }
      });
    }

    const {
      streetAddress,
      houseNumber,
      landmark,
      village,
      ward,
      city,
      districtName,
      state,
      postalCode,
      type,
      isDefault
    } = req.body;

    // Strict ownership verification: where contains id, userId, and districtId
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
        districtId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Address not found or unauthorized" }
      });
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (isDefault && !existingAddress.isDefault) {
        // Clear other defaults
        await tx.address.updateMany({
          where: { userId, districtId, isDefault: true },
          data: { isDefault: false }
        });
      }

      return tx.address.update({
        where: {
          userId_id: { userId, id: addressId }
        },
        data: {
          ...(streetAddress !== undefined && { streetAddress }),
          ...(houseNumber !== undefined && { houseNumber }),
          ...(landmark !== undefined && { landmark }),
          ...(village !== undefined && { village }),
          ...(ward !== undefined && { ward }),
          ...(city !== undefined && { city }),
          ...(districtName !== undefined && { districtName }),
          ...(state !== undefined && { state }),
          ...(postalCode !== undefined && { postalCode }),
          ...(type !== undefined && { type }),
          ...(isDefault !== undefined && { isDefault: !!isDefault })
        }
      });
    });

    // Write Audit Logs
    await logCustomerAuditEvent(req, "ADDRESS_UPDATED", updatedAddress.id, "Address", `Updated address: ${streetAddress || existingAddress.streetAddress}`, updatedAddress);
    if (isDefault && !existingAddress.isDefault) {
      await logCustomerAuditEvent(req, "ADDRESS_DEFAULT_CHANGED", updatedAddress.id, "Address", `Set address ${updatedAddress.id} as default`, { addressId: updatedAddress.id });
    }

    return res.status(200).json({
      success: true,
      data: updatedAddress
    });
  } catch (err: any) {
    console.error("❌ [ADDRESSES] Update failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to update address" }
    });
  }
});

// DELETE /api/customer/addresses/:id
router.delete("/addresses/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.ctx?.userId;
    const districtId = req.ctx?.districtId;
    if (!userId || !districtId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const addressId = parseInt(req.params.id);
    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid address ID" }
      });
    }

    // Strict ownership verification
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
        districtId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Address not found or unauthorized" }
      });
    }

    await prisma.address.delete({
      where: {
        userId_id: { userId, id: addressId }
      }
    });

    // Write Audit Log
    await logCustomerAuditEvent(req, "ADDRESS_DELETED", addressId, "Address", `Deleted address: ${existingAddress.streetAddress}`);

    return res.status(200).json({
      success: true,
      data: { message: "Address deleted successfully" }
    });
  } catch (err: any) {
    console.error("❌ [ADDRESSES] Deletion failed:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to delete address" }
    });
  }
});

export default router;
