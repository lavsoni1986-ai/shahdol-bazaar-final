import { districtMemory } from "../services/district-memory.service";

// Schedule interval: Run every 6 hours
const SCHEDULE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export const startMemoryCleanupScheduler = () => {
  console.log("🧠 Starting District Memory Cleanup Scheduler...");

  const runMemoryCleanup = async () => {
    try {
      console.log("🧹 Running district memory cleanup...");

      await districtMemory.cleanupExpiredMemory();

      console.log("✅ District memory cleanup completed");
    } catch (error) {
      console.error("❌ Memory cleanup scheduler error:", error);
    }
  };

  // Run immediately on start
  runMemoryCleanup();

  // Then schedule every 6 hours
  setInterval(runMemoryCleanup, SCHEDULE_INTERVAL);
};