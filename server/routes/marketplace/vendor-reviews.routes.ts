// @ts-nocheck
import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { z } from "zod";

const router = Router();

// Zod validation schema for review inputs
const reviewSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").max(100),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z.string().max(1000).optional(),
});

// ============================================
// ✍️ POST /api/vendors/:id/reviews — Submit Review
// ============================================
router.post("/:id/reviews", async (req: Request, res: Response) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    const bodyValidation = reviewSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: bodyValidation.error.errors[0].message
      });
    }

    const { customerName, rating, comment } = bodyValidation.data;
    const userId = req.ctx?.userId || null;
    const districtId = req.ctx?.districtId || 1; // Default to Shahdol (1)

    // Check if vendor exists and is in the correct district
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor || vendor.isDeleted) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    // Enforce district scoping
    if (vendor.districtId !== districtId) {
      return res.status(403).json({ success: false, error: "Access denied: vendor not in your district" });
    }

    // Spam Protection: Enforce one review per vendor/customer/day
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingReview = await prisma.vendorReview.findFirst({
      where: {
        vendorId,
        customerName,
        createdAt: { gte: startOfToday }
      }
    });

    if (existingReview) {
      return res.status(429).json({
        success: false,
        error: "Only one review is allowed per customer per vendor per day."
      });
    }

    // Submit the review inside a transaction
    const newReview = await prisma.$transaction(async (tx) => {
      const review = await tx.vendorReview.create({
        data: {
          vendorId,
          userId,
          customerName,
          rating,
          comment: comment || null,
          districtId,
          isApproved: true // Auto-approved by default, can be flagged later
        }
      });

      // Recalculate vendor averageRating
      const agg = await tx.vendorReview.aggregate({
        where: { vendorId, isApproved: true },
        _avg: { rating: true }
      });

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          averageRating: agg._avg.rating || 0.0
        }
      });

      return review;
    });

    return res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (err: any) {
    console.error("❌ [VENDOR REVIEW SUBMIT] failed:", err.message);
    return res.status(500).json({ success: false, error: "Failed to submit review" });
  }
});

// ============================================
// ✍️ GET /api/vendors/:id/reviews — List Reviews
// ============================================
router.get("/:id/reviews", async (req: Request, res: Response) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Cap at 50

    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendorId,
        isApproved: true
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    return res.json({
      success: true,
      data: reviews
    });
  } catch (err: any) {
    console.error("❌ [VENDOR REVIEWS FETCH] failed:", err.message);
    return res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

export default router;
