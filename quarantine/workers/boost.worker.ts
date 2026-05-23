import { prisma } from "../storage";

// Schedule interval: Run every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export const startBoostCleanup = () => {
  console.log("🚀 Starting Boost Expiry Cleanup...");

  const runBoostCleanup = async () => {
    try {
      console.log("🧹 Running boost expiry cleanup...");

      const now = new Date();
      const result = await prisma.vendor.updateMany({
        where: {
          isSponsored: true,
          boostExpiry: {
            lt: now // Less than current time (expired)
          }
        },
        data: {
          isSponsored: false,
          boostWeight: 0,
          boostExpiry: null
        }
      });

      if (result.count > 0) {
        console.log(`✅ Cleaned up ${result.count} expired boost(s)`);
      } else {
        console.log("ℹ️ No expired boosts to clean up");
      }

    } catch (error) {
      console.error("❌ Boost cleanup error:", error);
    }
  };

  // Run immediately on start
  runBoostCleanup();

  // Then schedule every hour
  setInterval(runBoostCleanup, CLEANUP_INTERVAL);
};