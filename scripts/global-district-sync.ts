// 📁 scripts/global-district-sync.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Global Sovereign Data Sync (1 -> 2)...");

  const tables = ['category', 'shop', 'product', 'vendor', 'serviceWorker'];
  
  for (const table of tables) {
    // @ts-ignore - Dynamic table access
    const result = await prisma[table].updateMany({
      where: { districtId: 1 },
      data: { districtId: 2 }
    });
    console.log(`✅ Table '${table}': ${result.count} records updated.`);
  }

  console.log("🏁 BharatOS: All data successfully mapped to Shahdol (ID: 2)");
}

main().catch(console.error).finally(() => prisma.$disconnect());