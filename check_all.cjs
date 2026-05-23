const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = ['Vendor', 'Product', 'Shop', 'ServiceWorker', 'Category', 'BusTimetable', 'Hospital', 'Schools', 'Offer', 'Inquiry', 'AnalyticsEvent', 'FestiveEvent', 'MarketTrend'];
  
  for (const table of tables) {
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "${table}" WHERE district_id = 106`;
      const count = parseInt(result[0].count);
      if (count > 0) console.log(`${table}: ${count} records with district_id=106`);
      else console.log(`${table}: 0 records with district_id=106`);
    } catch (e) {
      console.log(`${table}: ERROR - ${e.message.substring(0, 50)}`);
    }
  }
}

main().finally(() => prisma.$disconnect());