import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllDistricts() {
  console.log("🔍 Checking which districts have data...\n");
  
  const districts = await prisma.district.findMany({
    select: { id: true, name: true, slug: true }
  });

  for (const d of districts) {
    const vendors = await prisma.vendor.count({ where: { districtId: d.id } });
    const products = await prisma.product.count({ where: { vendor: { districtId: d.id } } });
    
    if (vendors > 0 || products > 0) {
      console.log(`District ${d.id}: ${d.name} (${d.slug})`);
      console.log(`  - Vendors: ${vendors}, Products: ${products}`);
    }
  }

  // Also check products with direct districtId
  console.log("\n--- Products by direct districtId ---");
  const allProducts = await prisma.product.groupBy({
    by: ['districtId'],
    _count: true
  });
  
  for (const p of allProducts) {
    const district = await prisma.district.findUnique({ where: { id: p.districtId } });
    console.log(`District ${p.districtId} (${district?.name}): ${p._count} products`);
  }
}

checkAllDistricts()
  .then(() => prisma.$disconnect())
  .catch(console.error);