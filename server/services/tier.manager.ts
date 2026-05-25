import { prisma } from "../storage";

export interface SubscriptionStatus {
  tier: 'FREE' | 'SILVER' | 'GOLD';
  productLimit: number;
  productsUsed: number;
  isActive: boolean;
  canAddProducts: boolean;
  upgradeRequired: boolean;
  nextTier?: 'SILVER' | 'GOLD';
  nextTierLimit?: number;
  nextTierPrice?: number;
}

export class TierManager {
  private static readonly PLAN_LIMITS = {
    FREE: 2,
    SILVER: 20,
    GOLD: 100
  };

  private static readonly PLAN_PRICES = {
    SILVER: 299, // ₹299/month
    GOLD: 500   // ₹500/month
  };

  static async getSubscriptionStatus(merchantId: number): Promise<SubscriptionStatus> {
    const user = await prisma.user.findUnique({
      where: { id: merchantId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true
      }
    });

    const tier = (user?.subscriptionPlan || 'FREE') as 'FREE' | 'SILVER' | 'GOLD';
    const productLimit = this.PLAN_LIMITS[tier] || this.PLAN_LIMITS.FREE;
    const isActive = user?.subscriptionStatus === 'active';

    // Count current products
    const productsUsed = await prisma.product.count({
      where: { vendorId: merchantId }
    });

    const canAddProducts = isActive && productsUsed < productLimit;
    const upgradeRequired = !canAddProducts;

    let nextTier: 'SILVER' | 'GOLD' | undefined;
    let nextTierLimit: number | undefined;
    let nextTierPrice: number | undefined;

    if (tier === 'FREE') {
      nextTier = 'SILVER';
      nextTierLimit = this.PLAN_LIMITS.SILVER;
      nextTierPrice = this.PLAN_PRICES.SILVER;
    } else if (tier === 'SILVER') {
      nextTier = 'GOLD';
      nextTierLimit = this.PLAN_LIMITS.GOLD;
      nextTierPrice = this.PLAN_PRICES.GOLD;
    }

    return {
      tier,
      productLimit,
      productsUsed,
      isActive,
      canAddProducts,
      upgradeRequired,
      nextTier,
      nextTierLimit,
      nextTierPrice
    };
  }

  static async checkProductLimit(merchantId: number): Promise<{
    allowed: boolean;
    status: SubscriptionStatus;
    message?: string;
  }> {
    const status = await this.getSubscriptionStatus(merchantId);

    if (status.canAddProducts) {
      return { allowed: true, status };
    }

    const message = status.tier === 'FREE'
      ? `आपने ${status.productsUsed}/${status.productLimit} फ्री प्रोडक्ट डाल दिए हैं। अपनी दुकान को 'शहडोल का शोरूम' बनाने के लिए ₹${status.nextTierPrice}/महीना वाला ${status.nextTier} प्लान लें।`
      : status.tier === 'SILVER'
      ? `आपका सिल्वर प्लान खत्म हो गया है। ₹${status.nextTierPrice}/महीना में गोल्ड प्लान लेकर १००+ प्रोडक्ट डालें।`
      : 'आपका सब्स्क्रिप्शन खत्म हो गया है। कृपया रीन्यू करें।';

    return {
      allowed: false,
      status,
      message
    };
  }

  static async upgradeSubscription(merchantId: number, newTier: 'SILVER' | 'GOLD'): Promise<{
    success: boolean;
    subscription?: any;
    message?: string;
  }> {
    try {
      const productLimit = this.PLAN_LIMITS[newTier];
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month validity

      const user = await prisma.user.update({
        where: { id: merchantId },
        data: {
          subscriptionPlan: newTier,
          subscriptionStatus: 'active',
          subscriptionEndsAt: expiryDate
        }
      });

      return {
        success: true,
        subscription: user,
        message: `🎉 Congratulations! आपका ${newTier} प्लान सक्रिय हो गया है। अब ${productLimit} प्रोडक्ट तक डाल सकते हैं।`
      };
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      return {
        success: false,
        message: 'सब्स्क्रिप्शन अपग्रेड में दिक्कत हुई। कृपया दोबारा कोशिश करें।'
      };
    }
  }

  static async getUsageStats(merchantId: number): Promise<{
    currentUsage: number;
    limit: number;
    percentage: number;
    tier: string;
    daysLeft?: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: merchantId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true
      }
    });

    const tier = user?.subscriptionPlan || 'FREE';
    const limit = this.PLAN_LIMITS[tier as 'FREE' | 'SILVER' | 'GOLD'] || this.PLAN_LIMITS.FREE;

    const productsUsed = await prisma.product.count({
      where: { vendorId: merchantId }
    });

    const percentage = Math.min((productsUsed / limit) * 100, 100);

    let daysLeft: number | undefined;
    if (user?.subscriptionEndsAt) {
      const now = new Date();
      const expiry = new Date(user.subscriptionEndsAt);
      daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      currentUsage: productsUsed,
      limit,
      percentage,
      tier,
      daysLeft
    };
  }

  // Sovereign Logic: Allow_Listing = (P_count < P_limit) ∨ (Subscription_Active)
  static async canAddProduct(merchantId: number): Promise<boolean> {
    const check = await this.checkProductLimit(merchantId);
    return check.allowed;
  }
}
