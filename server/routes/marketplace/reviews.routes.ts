import { Router, type Request, type Response } from "express";
import { prisma } from "../../storage";
import { ErrorCode, sendError, sendSuccess } from "../../middleware/errorHandler";
import { recomputeTrustScore } from "../../services/dssl.service";

const router = Router();

router.get("/:productId", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const districtId = Number((req as any).ctx?.districtId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, "Invalid productId");
    }
    if (!Number.isInteger(districtId) || districtId <= 0) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context missing");
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
        product: {
          is: {
            vendor: {
              districtId
            }
          }
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return sendSuccess(res, reviews);
  } catch (err) {
    console.error("❌ REVIEWS GET ERROR:", err);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to fetch reviews");
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const districtId = Number((req as any).ctx?.districtId);
    const userId = Number((req as any).userId) || undefined;
    const productId = Number(req.body?.productId);
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : null;

    if (!Number.isInteger(districtId) || districtId <= 0) {
      return sendError(res, 400, ErrorCode.DISTRICT_REQUIRED, "District context missing");
    }
    if (!Number.isInteger(productId) || productId <= 0) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, "Invalid productId");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return sendError(res, 400, ErrorCode.BAD_REQUEST, "Rating must be between 1 and 5");
    }

    // Navigate through vendor relation (Product → Vendor → districtId)
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendor: { districtId: districtId }
      },
      select: { id: true },
    });
    if (!product) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, "Product not found in district");
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment,
      },
    });

    // Recompute trust score after review
    const productWithVendor = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true }
    });
    if (productWithVendor?.vendorId) {
      await recomputeTrustScore(productWithVendor.vendorId, districtId);
    }

    return sendSuccess(res, review);
  } catch (err) {
    console.error("❌ REVIEW CREATE ERROR:", err);
    return sendError(res, 500, ErrorCode.INTERNAL_ERROR, "Failed to create review");
  }
});

export default router;
