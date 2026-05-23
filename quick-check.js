// quick-check.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      include: { vendor: true }
    });

    console.log(`Found ${products.length} products:`);
    products.forEach(p => {
      console.log(`Product: "${p.name}", vendorId: ${p.vendorId}, vendor: ${p.vendor ? `"${p.vendor.name}"` : 'NULL'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();