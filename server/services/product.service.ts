// @ts-nocheck
import { withTransaction, findProductById, updateProduct, createAuditLogInTx, aggregateProduct, findVendorByIdInTx } from "../repositories";
import { AdminService } from "./admin.service";

// ============================================
// 🛍️ PRODUCT SERVICE LAYER
// ============================================
// Business logic for product operations
// Decoupled from route handlers for better testability

export class ProductService {
  // Approve product with fraud detection
  static async approveProduct(productId: number, adminId: number, districtId: number) {
    return withTransaction(async (tx) => {
      const product = await findProductByIdInTx(tx, productId);

      if (!product) throw new Error("Product not found");
      if (product.districtId !== districtId) throw new Error("Access denied - wrong district");

      // 🕵️ FRAUD DETECTION: Enhanced DSSL fraud scoring
      const avgPriceResult = await tx.product.aggregate({
        where: { districtId, approved: true },
        _avg: { price: true }
      });
      const averagePrice = avgPriceResult._avg.price || 0;
      const priceDeviation = product.price ? (product.price / averagePrice) : 0;

      // Get vendor fraud score
      const vendor = await findVendorByIdInTx(tx, product.vendorId);

      // DSSL Fraud Score calculation
      const fraudScore =
        (priceDeviation > 5 ? 0.4 : priceDeviation > 2 ? 0.2 : 0) + // Price anomaly
        ((vendor?.fraudScore || 0) * 0.3) + // Vendor fraud history
        ((vendor?.rating || 5) < 3 ? 0.3 : 0); // Low-rated vendor

      let fraudAlert = fraudScore > 0.4;
      let requiresReview = fraudScore > 0.7;

      // Update product status
      await updateProductInTx(tx, productId, {
        approved: !requiresReview, // Block if fraud score too high
        status: requiresReview ? 'pending' : 'approved'
      });

      // 🧾 AUDIT LOGGING with fraud metadata
      const auditResult = await createAuditLogInTx(tx, {
        action: requiresReview ? "PRODUCT_FLAGGED_FOR_RE_VIEW" : "PRODUCT_APPROVED",
        userId: adminId,
        targetId: productId,
        targetType: "product",
        details: `${requiresReview ? 'Flagged for review' : 'Approved'} product: ${product.title}`,
        metadata: {
          fraudScore: fraudScore.toFixed(2),
          priceDeviation: priceDeviation.toFixed(2),
          averagePrice,
          requiresReview,
          fraudAlert
        },
        districtId
      });

      // 📊 INVALIDATE CACHE: Admin metrics changed
      AdminService.invalidateMetricsCache(districtId);

      return {
        success: true,
        productId,
        approved: !requiresReview,
        requiresReview,
        fraudScore,
        auditId: auditResult.id
      };
    });
  }

  // Reject product with reason tracking
  static async rejectProduct(productId: number, adminId: number, districtId: number, reason?: string) {
    return withTransaction(async (tx) => {
      const product = await findProductByIdInTx(tx, productId);

      if (!product) throw new Error("Product not found");
      if (product.districtId !== districtId) throw new Error("Access denied - wrong district");

      await updateProductInTx(tx, productId, { approved: false, status: 'rejected' });

      const auditResult = await createAuditLogInTx(tx, {
        action: "PRODUCT_REJECTED",
        userId: adminId,
        targetId: productId,
        targetType: "product",
        details: `Rejected product: ${product.title}`,
        metadata: { reason: reason || null },
        districtId
      });

      return { success: true, auditId: auditResult.id };
    });
  }
}
