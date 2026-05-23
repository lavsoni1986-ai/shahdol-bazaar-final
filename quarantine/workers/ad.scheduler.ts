import { prisma } from "../storage";
import { RevenueEngine } from "../services/revenue.engine";

// Schedule interval: Run every hour
const SCHEDULE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export const startAdScheduler = () => {
  console.log("🎯 Starting Sovereign Ad Scheduler...");

  const runAdScheduling = async () => {
    try {
      console.log("📅 Running ad scheduling cycle...");

      await scheduleAdsForTomorrow();
      await optimizeActiveCampaigns();
      await processAdPayments();

      console.log("✅ Ad scheduling cycle completed");
    } catch (error) {
      console.error("❌ Ad scheduler error:", error);
    }
  };

  // Run immediately on start
  runAdScheduling();

  // Then schedule every hour
  setInterval(runAdScheduling, SCHEDULE_INTERVAL);
};

async function scheduleAdsForTomorrow(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all pending advertisements that should start tomorrow
  const pendingAds = await prisma.advertisement.findMany({
    where: {
      isActive: false,
      startDate: { lte: tomorrow },
      OR: [
        { endDate: null },
        { endDate: { gte: tomorrow } }
      ]
    },
    include: {
      adSlots: true
    }
  });

  for (const ad of pendingAds) {
    // Check if merchant has sufficient balance (in production, check wallet)
    const hasBalance = await checkMerchantBalance(ad.merchantId, ad.bidAmount);

    if (hasBalance) {
      // Activate advertisement
      await prisma.advertisement.update({
        where: { id: ad.id },
        data: { isActive: true }
      });

      console.log(`🎯 Activated ad ${ad.id} for merchant ${ad.merchantId}`);
    } else {
      console.log(`⚠️ Insufficient balance for ad ${ad.id}, skipping activation`);
    }
  }
}

async function optimizeActiveCampaigns(): Promise<void> {
  // Get all active advertisements
  const activeAds = await prisma.advertisement.findMany({
    where: {
      isActive: true,
      endDate: { gte: new Date() }
    },
    include: {
      adSlots: true
    }
  });

  for (const ad of activeAds) {
    // Check if daily budget exceeded
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySpend = await prisma.transaction.aggregate({
      where: {
        merchantId: ad.merchantId,
        type: "AD_REVENUE",
        createdAt: { gte: today },
        status: "COMPLETED"
      },
      _sum: { amount: true }
    });

    const spentToday = todaySpend._sum.amount || 0;

    if (spentToday >= ad.dailyBudget) {
      // Pause ad for today
      await prisma.advertisement.update({
        where: { id: ad.id },
        data: { isActive: false }
      });

      console.log(`⏸️ Paused ad ${ad.id} - daily budget ₹${ad.dailyBudget} exceeded (spent: ₹${spentToday})`);

      // Schedule reactivation for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await prisma.advertisement.update({
        where: { id: ad.id },
        data: {
          isActive: true,
          startDate: tomorrow
        }
      });
    } else {
      // Optimize ad slots based on performance
      await optimizeAdSlots(ad);
    }
  }
}

async function optimizeAdSlots(ad: any): Promise<void> {
  // Analyze performance of each slot
  for (const slot of ad.adSlots) {
    const impressions = slot.impressions;
    const clicks = slot.clicks;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    // If CTR is below 1%, lower the position
    if (ctr < 1 && slot.position < 10) {
      await prisma.adSlot.update({
        where: { id: slot.id },
        data: { position: slot.position + 1 }
      });
    }

    // If CTR is above 3%, try to improve position
    if (ctr > 3 && slot.position > 1) {
      // Check if better position is available
      const betterSlot = await prisma.adSlot.findFirst({
        where: {
          advertisementId: { not: ad.id },
          districtId: slot.districtId,
          position: slot.position - 1
        }
      });

      if (!betterSlot) {
        await prisma.adSlot.update({
          where: { id: slot.id },
          data: { position: slot.position - 1 }
        });
      }
    }
  }
}

async function processAdPayments(): Promise<void> {
  // Get all ad impressions/clicks that haven't been billed yet
  const unbilledSlots = await prisma.adSlot.findMany({
    where: {
      impressions: { gt: 0 },
      lastShown: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
    },
    include: {
      advertisement: true
    }
  });

  for (const slot of unbilledSlots) {
    const ad = slot.advertisement;

    // Calculate charges (₹0.01 per impression, ₹0.50 per click)
    const impressionCharge = slot.impressions * 0.01;
    const clickCharge = slot.clicks * 0.50;
    const totalCharge = impressionCharge + clickCharge;

    if (totalCharge > 0) {
      // Process payment
      await RevenueEngine.processAdPayment(ad.merchantId, totalCharge);

      // Reset counters for next billing cycle
      await prisma.adSlot.update({
        where: { id: slot.id },
        data: {
          impressions: 0,
          clicks: 0,
          lastShown: new Date()
        }
      });

      console.log(`💰 Processed ₹${totalCharge} for ad ${ad.id} slot ${slot.id}`);
    }
  }
}

async function checkMerchantBalance(merchantId: number, requiredAmount: number): Promise<boolean> {
  // In production, check actual wallet balance
  // For now, assume sufficient balance
  return true;
}

// Manual trigger for testing
export const triggerAdScheduling = () => {
  console.log("🔧 Manual ad scheduling trigger");
  const runAdScheduling = async () => {
    try {
      await scheduleAdsForTomorrow();
      await optimizeActiveCampaigns();
      await processAdPayments();
      console.log("✅ Manual ad scheduling completed");
    } catch (error) {
      console.error("❌ Manual ad scheduling error:", error);
    }
  };
  runAdScheduling();
};
