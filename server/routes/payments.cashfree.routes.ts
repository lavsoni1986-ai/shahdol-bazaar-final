import express, { Request, Response } from "express";
import axios from "axios";
import { requireAuth } from "../auth/middleware";
import { findUserById, updateUser } from "../repositories/user.repo";
import { findVendorById, updateVendor } from "../repositories/vendor.repo";
import { success, failure, unauthorized } from "../lib/apiResponse";

const router = express.Router();

// ============================================================
// INLINE HELPERS (payment.repo functions were commented out)
// ============================================================

/**
 * Derive isSponsored from boostedUntil (compatibility layer)
 * isSponsored is NOT a DB field — derived at response time only
 */
function isBoostActive(vendor: any): boolean {
  return !!(vendor?.boostedUntil && new Date(vendor.boostedUntil) > new Date());
}

/**
 * Activate boost for a vendor — writes only canonical fields
 * isSponsored is NOT a DB field, do NOT write it
 */
async function activateBoost(
  vendorId: number,
  boostData: { boostWeight: number; boostExpiry: Date },
  meta: { userId: number; orderId: string; amount: number; plan: string; status: string }
) {
  const result = await updateVendor(vendorId, {
    boostedUntil: boostData.boostExpiry,
  });
  return result;
}

/**
 * Upgrade user subscription
 */
async function upgradeUserSubscription(
  userId: number,
  subData: { subscriptionPlan: string; subscriptionStatus: string; subscriptionEndsAt: Date },
  meta: { userId: number; orderId: string; amount: number; plan: string; status: string }
) {
  await updateUser(userId, {
    subscriptionEndsAt: subData.subscriptionEndsAt,
  });
}

/**
 * CREATE CASHFREE PAYMENT SESSION
 * POST /api/payments/create
 */
export const createCashfreeOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const { plan } = req.body;
    const userId = req.ctx?.userId!;

    // Validate plan and pricing
    const pricing: Record<string, number> = {
      SILVER: 29900, // ₹299 in paise
      GOLD: 50000,   // ₹500 in paise
    };

    const amount = pricing[plan];
    if (!amount) {
      return failure(res, "VALIDATION_ERROR", "Invalid plan selected", 400);
    }

    // Get user details from database
    const user = await findUserById(userId, { username: true });
    if (!user) {
      return failure(res, "USER_NOT_FOUND", "User not found", 404);
    }

    // Create Cashfree order
    const orderResponse = await axios.post(
      `https://api.cashfree.com/pg/orders`,
      {
        order_id: `order_${userId}_${Date.now()}`,
        order_amount: amount / 100,
        order_currency: "INR",
        customer_details: {
          customer_id: userId.toString(),
          customer_name: user.username,
          customer_email: "",
        },
        order_meta: {
          plan: plan,
          user_id: userId,
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2022-09-01",
          "Content-Type": "application/json",
        },
      }
    );

    const order = orderResponse.data;

    return success(res, {
      payment_session_id: order.payment_session_id,
      order_id: order.order_id,
      cashfree_mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    });

  } catch (err: any) {
    console.error("Cashfree order creation failed:", err);
    return failure(res, "SERVER_ERROR", "Failed to create payment session", 500);
  }
};

/**
 * VERIFY CASHFREE PAYMENT & UPGRADE PLAN
 * POST /api/payments/verify
 */
export const verifyCashfreePayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const userId = req.ctx?.userId!;
    const { orderId } = req.body;

    // 2. Verify with Cashfree API
    const response = await axios.get(
      `https://api.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2022-09-01",
        },
      }
    );

    const order = response.data;
    if (order.order_status !== "PAID") {
      return failure(res, "PAYMENT_ERROR", "Payment not completed", 400);
    }

    // 3. Plan Trust & Validation Fix
    const verifiedPlan = order.order_meta?.plan;
    const isBoostPurchase = order.order_meta?.type === 'boost';

    // Validate plan or boost
    if (isBoostPurchase) {
      if (!verifiedPlan || typeof verifiedPlan !== 'object' || !verifiedPlan.vendorId) {
        return failure(res, "VALIDATION_ERROR", "Invalid boost metadata", 400);
      }
    } else {
      if (!["SILVER", "GOLD"].includes(verifiedPlan)) {
        return failure(res, "VALIDATION_ERROR", "Invalid plan metadata", 400);
      }
    }

    if (isBoostPurchase) {
      // 4. Boost Activation Logic
      const vendorId = verifiedPlan.vendorId;
      const vendor = await findVendorById(vendorId);

      if (!vendor) {
        return failure(res, "VALIDATION_ERROR", "Vendor not eligible for boost", 400);
      }

      // Check if vendor already has active boost — use boostedUntil (canonical field)
      if (isBoostActive(vendor)) {
        return failure(res, "VALIDATION_ERROR", "Vendor already has active boost", 400);
      }

      const boostWeight = 25;
      const boostExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // 5. Atomic Boost Activation — writes only boostedUntil (NOT isSponsored)
      await activateBoost(vendorId, { boostWeight, boostExpiry }, {
        userId,
        orderId,
        amount: order.order_amount,
        plan: "BOOST",
        status: "PAID",
      });

      return success(res, {
        message: "Boost Activated for 7 days!",
        boost: { vendorId, boostWeight, boostExpiry }
      });
    }

    // Original subscription logic
    const user = await findUserById(userId, { subscriptionEndsAt: true });
    const baseDate = user?.subscriptionEndsAt && user.subscriptionEndsAt > new Date()
      ? user.subscriptionEndsAt
      : new Date();
    const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await upgradeUserSubscription(userId, {
      subscriptionPlan: verifiedPlan,
      subscriptionStatus: "active",
      subscriptionEndsAt: newExpiry,
    }, {
      userId,
      orderId,
      amount: order.order_amount,
      plan: verifiedPlan,
      status: "PAID",
    });

    return success(res, { message: "Sovereign Plan Activated!", plan: verifiedPlan });

  } catch (err: any) {
    console.error(`PAYMENT_VERIFY_ERROR [Order: ${req.body.orderId}]:`, err.message);
    return failure(res, "SERVER_ERROR", "Verification failed", 500);
  }
};

/**
 * CREATE BOOST PAYMENT ORDER
 * POST /api/payments/boost
 */
export const createBoostOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const { vendorId } = req.body;
    const userId = req.ctx?.userId!;

    // Get user data for payment
    const user = await findUserById(userId, {});
    if (!user) {
      return failure(res, "VALIDATION_ERROR", "User not found", 400);
    }

    // Validate vendor ownership and eligibility
    const vendor = await findVendorById(vendorId);
    if (!vendor) {
      return failure(res, "VALIDATION_ERROR", "Vendor not eligible for boost", 400);
    }

    // Check if vendor already has active boost — use boostedUntil (canonical field)
    if (isBoostActive(vendor)) {
      return failure(res, "VALIDATION_ERROR", "Vendor already has active boost", 400);
    }

    // Simplified pricing: ₹299 for 7 days boost
    const boostPrice = 299;

    // Create Cashfree order for 7-day boost
    const orderData = {
      order_id: `BOOST_${Date.now()}_${vendorId}`,
      order_amount: boostPrice,
      order_currency: "INR",
      customer_details: {
        customer_id: userId.toString(),
        customer_email: "boost@shahdolbazaar.com",
        customer_phone: "9999999999",
      },
      order_meta: {
        type: "boost",
        vendorId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/boost/success`,
        notify_url: `${process.env.BACKEND_URL || 'http://localhost:5002'}/api/payments/webhook`,
      },
      order_tags: {
        type: "boost",
        plan: "7_DAY_BOOST",
        vendor: vendor.name,
      },
    };

    const response = await axios.post(
      "https://api.cashfree.com/pg/orders",
      orderData,
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2022-09-01",
          "Content-Type": "application/json",
        },
      }
    );

    const order = response.data;

    return success(res, {
      orderId: order.order_id,
      paymentLink: order.payment_link,
      amount: boostPrice,
    });

  } catch (err: any) {
    console.error("Cashfree boost order creation failed:", err);
    return failure(res, "SERVER_ERROR", "Failed to create boost payment", 500);
  }
};

// Register routes
router.post("/create", requireAuth, createCashfreeOrder);
router.post("/boost", requireAuth, createBoostOrder);
router.post("/verify", requireAuth, verifyCashfreePayment);

export default router;
