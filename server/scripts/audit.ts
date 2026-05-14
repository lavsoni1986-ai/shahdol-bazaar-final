import { fileURLToPath } from 'url';
import { prisma } from "../storage";

async function runSovereignAudit() {
  console.log("🔍 BHARAT-OS DEEP DIAGNOSTIC STARTING...");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const criticalLogs = await prisma.adminLog.findMany({
    where: { action: "ERROR", createdAt: { gte: oneHourAgo } }
  });

  const inconsistentVendors = await prisma.vendor.findMany({
    where: { dsslScore: { lt: 20 }, status: "APPROVED" }
  });

  console.table(criticalLogs);
  console.log(`⚠️ CRITICAL: ${inconsistentVendors.length} vulnerable vendors found!`);

  // 🔍 हाई-रिस्क यूज़र्स की जांच (UserIntelligence टेबल के जरिए)
  const highRiskUsers = await prisma.user.findMany({
    where: {
      userIntelligence: {
        is: {  // <--- यह जादुई कीवर्ड 'is' जोड़ना जरूरी है
          OR: [
            { riskScore: { gt: 80 } },
            { trustScore: { lt: 20 } }
          ]
        }
      }
    },
    include: {
      userIntelligence: true
    }
  });

  // 🔥 ध्यान दें: यहाँ highRiskUsers.length होना चाहिए
  console.log(`🚨 HIGH RISK: ${highRiskUsers.length} users with high risk score not blocked!`);

  if (highRiskUsers.length > 0) {
    console.table(highRiskUsers.map(u => ({
      ID: u.id,
      Username: u.username,
      Trust: u.userIntelligence?.trustScore,
      Fraud: u.userIntelligence?.riskScore
    })));
  }

  console.log("✅ DEEP DIAGNOSTIC COMPLETED");
}

// 🚀 मॉडर्न ESM तरीका यह चेक करने का कि फाइल सीधे रन हो रही है या नहीं
const isMainModule = import.meta.url === `file://${fileURLToPath(import.meta.url)}`;

// अगर आप सीधे 'tsx' से चला रहे हैं, तो यह फंक्शन कॉल होगा
if (process.argv[1] && (process.argv[1].endsWith('audit.ts') || process.argv[1].endsWith('audit'))) {
  runSovereignAudit()
    .catch(err => {
      console.error("❌ Audit Failed:", err);
      process.exit(1);
    });
}

export { runSovereignAudit };