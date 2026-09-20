import { Router } from "express";
import { prisma } from "../storage";
import { requireAuth } from "../auth/middleware";

const router = Router();

const success = <T,>(res: any, data: T) => res.json({ success: true, data });
const failure = (res: any, code: string, message: string, status = 400, details: unknown = null) =>
  res.status(status).json({
    success: false,
    error: { code, message, details }
  });

const SUBSCRIPTION_PLANS = {
  FREE: { productLimit: 10, monthlyPrice: 0 },
  SILVER: { productLimit: 50, monthlyPrice: 299 },
  GOLD: { productLimit: 200, monthlyPrice: 999 }
} as const;

// 💰 BUSINESS MODEL: Subscription Upgrade API (Disabled pending real payment integration)
router.post("/billing/upgrade", requireAuth, async (_req, res) => {
  return failure(
    res,
    "PAYMENT_DISABLED",
    "Online subscription payment is currently disabled. Please contact administration for tier upgrades.",
    403
  );
});

// 💰 BUSINESS MODEL: Get User Plan
router.get("/billing/plan", requireAuth, async (req, res) => {
  try {
    if (!(req as any).user) return failure(res, "AUTH_ERROR", "Unauthorized");

    const user = await prisma.user.findUnique({
      where: { id: (req as any).ctx?.userId! },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true
      }
    });

    if (!user) return failure(res, "NOT_FOUND", "User not found");

    const planConfig =
      SUBSCRIPTION_PLANS[user.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.FREE;

    return success(res, {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      expiresAt: user.subscriptionEndsAt,
      productLimit: planConfig.productLimit,
      monthlyPrice: planConfig.monthlyPrice
    });
  } catch (err) {
    console.error("Get plan error:", err);
    return failure(res, "SERVER_ERROR", "Failed to fetch plan details");
  }
});

export default router;

