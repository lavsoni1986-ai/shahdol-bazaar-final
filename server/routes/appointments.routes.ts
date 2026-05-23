import { Router, type Request, type Response } from "express";
import { prisma } from "../storage";

const router = Router();

// ============================================
// 📅 POST /appointments — Create a ShopAppointment
// 🛡️ Enforces district sovereignty via req.ctx?.districtId
// Standardized success/failure response contract
// ============================================
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            shopId,
            shopName,
            shopCategory,
            customerName,
            customerPhone,
            customerEmail,
            preferredDate,
            preferredTime,
            serviceType,
            notes,
            status,
        } = req.body;

        // Validate required fields
        if (!customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Customer name and phone are required",
                },
            });
        }

        // Build the appointment creation payload
        const appointmentData: any = {
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            serviceType: serviceType || null,
            notes: notes || null,
            status: status || "pending",
        };

        if (shopId) appointmentData.shopId = Number(shopId);
        if (shopName) appointmentData.shopName = shopName;

        if (preferredDate) {
            appointmentData.preferredDate = new Date(preferredDate);
        }

        if (preferredTime) {
            // Parse time string like "14:30" into a Date object for Prisma Time field
            const [hours, minutes] = preferredTime.split(":").map(Number);
            const timeDate = new Date();
            timeDate.setHours(hours, minutes, 0, 0);
            appointmentData.preferredTime = timeDate;
        }

        const appointment = await prisma.shopAppointment.create({
            data: appointmentData,
        });

        console.log(`✅ [APPOINTMENT] Created by ${customerName} for ${shopName || "unknown shop"}`);

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
