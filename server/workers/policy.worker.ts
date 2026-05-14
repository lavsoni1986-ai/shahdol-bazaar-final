// @ts-nocheck
import { scanAllVendors, executePolicyAction, PolicyDecision } from "../services/policy.engine";
import { prisma } from "../storage";

// Simple cron-like scheduler (in production, use node-cron or agenda)
const SCHEDULE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export const startPolicyWorker = () => {
  console.log("🚀 Starting Sovereign Sheriff Policy Worker...");

  const runPolicyScan = async () => {
    try {
      console.log("🔍 Scanning vendors for policy enforcement...");

      // Process all active districts
      const districts = await prisma.district.findMany({ where: { isActive: true } });
      let totalBoosted = 0, totalRestricted = 0, totalSuspended = 0, totalMonitored = 0;

      for (const district of districts) {
        console.log(`🔍 Processing district: ${district.name}`);
        const decisions = await scanAllVendors(district.id);

        let boosted = 0, restricted = 0, suspended = 0, monitored = 0;

        for (const decision of decisions) {
          await executePolicyAction(decision);

          switch (decision.action) {
            case 'boost': boosted++; totalBoosted++; break;
            case 'restrict': restricted++; totalRestricted++; break;
            case 'suspend': suspended++; totalSuspended++; break;
            case 'monitor': monitored++; totalMonitored++; break;
          }

          // Send notifications (placeholder - implement notification service)
          await sendPolicyNotification(decision);
        }

        console.log(`✅ District ${district.name}: ${boosted} boosted, ${restricted} restricted, ${suspended} suspended, ${monitored} monitored`);
      }

      console.log(`✅ Policy scan complete: ${totalBoosted} boosted, ${totalRestricted} restricted, ${totalSuspended} suspended, ${totalMonitored} monitored`);

    } catch (error) {
      console.error("❌ Policy worker error:", error);
    }
  };

  // Run immediately on start
  runPolicyScan();

  // Then schedule every hour
  setInterval(runPolicyScan, SCHEDULE_INTERVAL);
};

// Placeholder notification function - implement with email/SMS service
const sendPolicyNotification = async (decision: PolicyDecision) => {
  // Get vendor and admin details
  const vendor = await prisma.vendor.findUnique({
    where: { id: decision.vendorId },
    select: { name: true, userId: true }
  });

  // 🛡️ SOVEREIGN GUARD: अगर वेंडर किसी यूज़र से लिंक नहीं है, तो नोटिफिकेशन स्किप करें
  if (!vendor || !vendor.userId) {
    console.log(`⚠️ Vendor ${decision.vendorId} has no linked user. Skipping DB notification.`);
    return;
  }

  const notification = {
    type: 'POLICY_ACTION',
    recipientId: vendor.userId,
    title: `Sovereign Sheriff Action: ${decision.action.toUpperCase()}`,
    message: `Dear ${vendor.name}, our AI has taken the following action: ${decision.reason}. Current metrics: Sovereign Score: ${(decision.metrics.sovereignScore * 100).toFixed(1)}%, Risk: ${(decision.metrics.riskScore * 100).toFixed(1)}%, Error Rate: ${(decision.metrics.errorRate * 100).toFixed(1)}%`,
    data: decision
  };

  // In production, send via email/SMS/push notification
  console.log("📧 Policy Notification:", notification);

  // Store in database for dashboard
  await prisma.notification.create({
    data: {
      userId: vendor.userId, // ✅ अब यह कभी null नहीं होगा
      type: 'POLICY',
      title: notification.title,
      message: notification.message,
      data: notification.data as any
    }
  });
};
