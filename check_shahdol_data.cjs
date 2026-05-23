const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Vendor" WHERE district_id = 121`;
  console.log('Vendors (district_id=121):', vendors[0].c);
  
  const products = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Product" WHERE district_id = 121`;
  console.log('Products (district_id=121):', products[0].c);
  
  const services = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "ServiceWorker" WHERE district_id = 121`;
  console.log('ServiceWorkers (district_id=121):', services[0].c);
  
  const buses = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "BusTimetable" WHERE district_id = 121`;
  console.log('BusTimetable (district_id=121):', buses[0].c);
}

main().finally(() => prisma.$disconnect());