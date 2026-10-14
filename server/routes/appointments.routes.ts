import { Router, type Request, type Response } from "express";
import { prisma } from "../storage";
import { mutationLimiter } from "../auth/rateLimiter";

const router = Router();

// ============================================
// 📅 POST /appointments — Create a ShopAppointment
// 🛡️ Enforces district sovereignty via req.ctx?.districtId
// Standardized success/failure response contract
// ============================================
router.post("/", mutationLimiter, async (req: Request, res: Response) => {
    try {
        const {
            shopId,
            customerName,
            customerPhone,
            customerEmail,
            preferredDate,
            preferredTime,
            serviceType,
            notes,
        } = req.body;

        // 1. Authoritative District Context Resolution
        const districtId = req.ctx?.districtId || req.districtId;
        if (!districtId || isNaN(Number(districtId))) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "DISTRICT_REQUIRED",
                    message: "District context required",
                },
            });
        }
        const strictDistrictId = Number(districtId);

        // 2. Validate Target Vendor Identifier
        const parsedShopId = Number(shopId);
        if (!shopId || isNaN(parsedShopId) || !Number.isInteger(parsedShopId) || parsedShopId <= 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_SHOP_ID",
                    message: "A valid positive integer shopId is required",
                },
            });
        }

        // 3. Verify Target Vendor Exists, belongs to resolved district, and is eligible (APPROVED and not shadow-banned)
        const vendor = await prisma.vendor.findFirst({
            where: {
                id: parsedShopId,
                districtId: strictDistrictId,
                status: "APPROVED",
                isShadowBanned: false,
            },
            select: {
                id: true,
                name: true,
                category: true,
                districtId: true,
            },
        });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "VENDOR_NOT_FOUND",
                    message: "Target vendor not found in the current district or ineligible for bookings",
                },
            });
        }

        // 4. Validate Required Contact Fields & Length Bounds
        const trimmedName = typeof customerName === "string" ? customerName.trim() : "";
        const trimmedPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";

        if (!trimmedName || !trimmedPhone) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Customer name and phone are required",
                },
            });
        }

        if (trimmedName.length > 100) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Customer name cannot exceed 100 characters",
                },
            });
        }

        const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;
        if (!phoneRegex.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid phone number format",
                },
            });
        }

        let validatedEmail: string | null = null;
        if (customerEmail && typeof customerEmail === "string") {
            const trimmedEmail = customerEmail.trim();
            if (trimmedEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid customer email format",
                    },
                });
            }
            validatedEmail = trimmedEmail;
        }

        const validatedServiceType = typeof serviceType === "string" && serviceType.trim()
            ? serviceType.trim().slice(0, 100)
            : null;

        const validatedNotes = typeof notes === "string" && notes.trim()
            ? notes.trim().slice(0, 500)
            : null;

        // 5. Build Safe Appointment Payload
        // Authoritative vendor name is derived from DB; status is strictly forced to "pending"
        const appointmentData: any = {
            shopId: vendor.id,
            shopName: vendor.name,
            customerName: trimmedName,
            customerPhone: trimmedPhone,
            customerEmail: validatedEmail,
            serviceType: validatedServiceType,
            notes: validatedNotes,
            status: "pending",
        };

        if (preferredDate) {
            const parsedDate = new Date(preferredDate);
            if (!isNaN(parsedDate.getTime())) {
                appointmentData.preferredDate = parsedDate;
            }
        }

        if (preferredTime && typeof preferredTime === "string") {
            const timeParts = preferredTime.split(":").map(Number);
            if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
                const hours = Math.max(0, Math.min(23, timeParts[0]));
                const minutes = Math.max(0, Math.min(59, timeParts[1]));
                const timeDate = new Date();
                timeDate.setHours(hours, minutes, 0, 0);
                appointmentData.preferredTime = timeDate;
            }
        }

        const appointment = await prisma.shopAppointment.create({
            data: appointmentData,
        });

        console.log(`✅ [APPOINTMENT] Created by ${trimmedName} for ${vendor.name} (District: ${strictDistrictId})`);

        return res.status(201).json({
            success: true,
            data: appointment,
        });
    } catch (err: any) {
        console.error("❌ [APPOINTMENT] Creation failed:", err.message);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to create appointment",
            },
        });
    }
});

export default router;
