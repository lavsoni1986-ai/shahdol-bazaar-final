// @ts-nocheck
import { createTransaction, aggregateTransactions, countTransactions, findTransactions, findMerchantSubscription, upsertMerchantSubscription, findDistricts, createAdvertisement, findActiveAds, updateAdvertisement, findAdSlots, updateAdSlot } from "../repositories/revenue.repo";

export interface RevenueMetrics {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  pendingSettlements: number;
  topEarningMerchants: Array<{
    merchantId: number;
    name: string;
    revenue: number;
    transactions: number;
  }>;
  revenueByType: {
    subscriptions: number;
    advertisements: number;
    commissions: number;
  };
  dailyGoals: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

export interface AdBid {
  adId: number;
  merchantId: number;
  bidAmount: number;
  relevanceScore: number; // 0-1 based on user intent matching
  distance: number; // km from user to merchant
  finalRank: number;
}

export class RevenueEngine {
  private static readonly LAV_SHARE_PERCENTAGE = 0.95; // 95% to Lav
  private static readonly DAILY_REVENUE_GOAL = 5000; // ₹5000 daily target

  static async processSubscriptionPayment(merchantId: number, amount: number, tier: string): Promise<any> {
    const lavShare = amount * this.LAV_SHARE_PERCENTAGE;

    const transaction = await createTransaction({
      merchantId,
      amount,
      type: "SUBSCRIPTION",
      status: "COMPLETED",
      lavShare
    });

    // Update merchant subscription
    await this.activateMerchantSubscription(merchantId, tier);

    return {
      transaction,
      lavEarnings: lavShare,
      message: `✅ ₹${amount} subscription payment processed. Lav's share: ₹${lavShare}`
    };
  }

  static async processAdPayment(merchantId: number, amount: number): Promise<any> {
    const lavShare = amount * this.LAV_SHARE_PERCENTAGE;

    const transaction = await createTransaction({
      merchantId,
      amount,
      type: "AD_REVENUE",
      status: "COMPLETED",
      lavShare
    });

    return {
      transaction,
      lavEarnings: lavShare,
      message: `🎯 ₹${amount} ad revenue processed. Lav's share: ₹${lavShare}`
    };
  }

  static async calculateAdRank(bidAmount: number, relevanceScore: number, distance: number): Promise<number> {
    // Ad_Rank = (Bid_Amount × Relevance_Score) / (Distance + 1)
    const rank = (bidAmount * relevanceScore) / (distance + 1);
    return rank;
  }

  static async rankAdsForUser(
    userId: number,
    districtId: number,
    userIntent: string,
    userLocation?: { lat: number; lng: number }
  ): Promise<AdBid[]> {
    // Get active advertisements
    const activeAds = await findActiveAds({
      isActive: true,
      endDate: { gt: new Date() }
    }, { include: {
      merchant: true,
      adSlots: {
        where: { districtId }
      }
    } });

    const rankedAds: AdBid[] = [];

    for (const ad of activeAds) {
      // Calculate relevance score based on user intent
      const relevanceScore = this.calculateRelevanceScore(userIntent, ad.title, ad.description || undefined);

      // Calculate distance (mock for now - in production use actual coordinates)
      const distance = userLocation ? Math.random() * 20 : 5; // 0-20km

      // Calculate final rank
      const finalRank = await this.calculateAdRank(ad.bidAmount, relevanceScore, distance);

      rankedAds.push({
        adId: ad.id,
        merchantId: ad.merchantId,
        bidAmount: ad.bidAmount,
        relevanceScore,
        distance,
        finalRank
      });
    }

    // Sort by rank descending and return top 5
    return rankedAds
      .sort((a, b) => b.finalRank - a.finalRank)
      .slice(0, 5);
  }

  private static calculateRelevanceScore(userIntent: string, adTitle: string, adDescription?: string): number {
    const intentWords = userIntent.toLowerCase().split(' ');
    const adText = `${adTitle} ${adDescription || ''}`.toLowerCase();

    let matches = 0;
    for (const word of intentWords) {
      if (adText.includes(word)) {
        matches++;
      }
    }

    // Return relevance as percentage of matched words
    return Math.min(matches / intentWords.length, 1);
  }

  private static async activateMerchantSubscription(merchantId: number, tier: string): Promise<void> {
    const tierLimits = {
      'SILVER': 20,
      'GOLD': 100
    };

    const productLimit = tierLimits[tier as keyof typeof tierLimits] || 2;

    await upsertMerchantSubscription(
      { merchantId },
      {
        tier: tier as any,
        productLimit,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        tier: tier as any,
        productLimit,
        isActive: true,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    );
  }

  static async getRevenueMetrics(districtId?: number): Promise<RevenueMetrics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build district filter for transactions (through merchant relationship)
    const districtFilter = districtId ? {
      merchant: { districtId }
    } : {};

    // Total revenue (Lav's share)
    const totalRevenueResult = await aggregateTransactions({
      status: 'COMPLETED',
      ...districtFilter
    }, { lavShare: true });

    // Today's revenue
    const todayRevenueResult = await aggregateTransactions({
      status: 'COMPLETED',
      createdAt: { gte: today },
      ...districtFilter
    }, { lavShare: true });

    // Monthly revenue
    const monthlyRevenueResult = await aggregateTransactions({
      status: 'COMPLETED',
      createdAt: { gte: monthStart },
      ...districtFilter
    }, { lavShare: true });

    // Pending settlements
    const pendingResult = await aggregateTransactions({
      status: 'PENDING',
      ...districtFilter
    }, { amount: true });

    // Revenue by type
    const revenueByType = await groupTransactions(
      ['type'],
      {
        status: 'COMPLETED',
        ...districtFilter
      },
      { lavShare: true }
    );

    // Top earning merchants
    const topMerchants = await groupMerchantTransactions(
      ['merchantId'],
      { status: 'COMPLETED', merchantId: { not: null } },
      { lavShare: true },
       { _count: true },
      { orderBy: { _sum: { lavShare: 'desc' } }, take: 10 }
    );

    const topEarningMerchants = await Promise.all(
      topMerchants.map(async (merchant) => {
        const user = await findUserById(merchant.merchantId!);
        return {
          merchantId: merchant.merchantId!,
          name: user?.shopName || user?.username || 'Unknown',
          revenue: merchant._sum.lavShare || 0,
          transactions: merchant._count
        };
      })
    );

    // Daily goal tracking
    const todayAchieved = todayRevenueResult._sum.lavShare || 0;
    const dailyGoalPercentage = (todayAchieved / this.DAILY_REVENUE_GOAL) * 100;

    return {
      totalRevenue: totalRevenueResult._sum.lavShare || 0,
      todayRevenue: todayAchieved,
      monthlyRevenue: monthlyRevenueResult._sum.lavShare || 0,
      pendingSettlements: pendingResult._sum.amount || 0,
      topEarningMerchants,
      revenueByType: revenueTypeMap,
      dailyGoals: {
        target: this.DAILY_REVENUE_GOAL,
        achieved: todayAchieved,
        percentage: Math.min(dailyGoalPercentage, 100)
      }
    };
  }

  static async createAdvertisement(merchantId: number, adData: {
    title: string;
    description?: string;
    imageUrl?: string;
    bidAmount: number;
    dailyBudget: number;
    targetCategories?: string[];
    targetTimeSlots?: string[];
  }): Promise<any> {
    const ad = await createAdvertisement({
      merchantId,
      title: adData.title,
      description: adData.description,
      imageUrl: adData.imageUrl,
      bidAmount: adData.bidAmount,
      dailyBudget: adData.dailyBudget,
      isActive: false // Requires approval
    });

    // Create ad slots for different positions and districts
    const districts = await findDistricts({ isActive: true });

    for (const district of districts) {
      for (let position = 1; position <= 5; position++) {
        await createAdSlot({
          advertisementId: ad.id,
          position,
          districtId: district.id,
          category: adData.targetCategories?.[0],
          timeSlot: adData.targetTimeSlots?.[0]
        });
      }
    }

    return ad;
  }
}
