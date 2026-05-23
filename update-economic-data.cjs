const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating existing entities for AI indexing...');

  // Update vendor
  await prisma.vendor.update({
    where: { id: 1 },
    data: {
      isAiIndexed: true,
      searchText: 'electronics shop electronic store gadgets headphones speakers mobiles phones chargers cables shree ram',
      aiRankScore: 85.5
    }
  });
  console.log('✅ Updated vendor for AI indexing');

  // Update product
  await prisma.product.update({
    where: { id: 1 },
    data: {
      isAiIndexed: true,
      searchText: 'boat rockerz headphones wireless bluetooth earphones audio music sound electronics gadget',
      aiRankScore: 78.2
    }
  });
  console.log('✅ Updated product for AI indexing');

  // ServiceWorker doesn't have searchText field, skipping update
  // Hospital and School creation skipped due to schema issues

  console.log('\n🎉 Core entities AI-ready!');
  console.log('📊 Final entity counts:');
  const [vendorCount, productCount, serviceCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.serviceWorker.count()
  ]);

  console.log(`- Vendors: ${vendorCount} (AI indexed: ${await prisma.vendor.count({where: {isAiIndexed: true}})})`);
  console.log(`- Products: ${productCount} (AI indexed: ${await prisma.product.count({where: {isAiIndexed: true}})})`);
  console.log(`- Services: ${serviceCount}`);
  console.log(`- Total Economic Entities: ${vendorCount + productCount + serviceCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });