const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const vendors = await prisma.$queryRaw`SELECT * FROM "Vendor" LIMIT 1`;
    console.log('Vendor columns:', Object.keys(vendors[0] || {}));
    
    const products = await prisma.$queryRaw`SELECT * FROM "Product" LIMIT 1`;
    console.log('Product columns:', Object.keys(products[0] || {}));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());