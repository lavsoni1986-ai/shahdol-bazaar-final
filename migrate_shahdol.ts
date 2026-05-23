import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToShahdol() {
  const sourceDistrictId = 57; // Jabalpur has data
  const targetDistrictId = 121; // Shahdol target

  console.log(`🔄 Migrating data from District ${sourceDistrictId} to Shahdol (121)...\n`);

  // 1. Move Vendors
  const vendors = await prisma.vendor.findMany({ 
    where: { districtId: sourceDistrictId },
    select: { id: true }
  });
  
  for (const v of vendors) {
    await prisma.vendor.update({
      where: { id: v.id },
      data: { districtId: targetDistrictId }
    });
  }
  console.log(`✅ Moved ${vendors.length} vendors to Shahdol`);

  // 2. Move Products (via vendor)
  const products = await prisma.product.findMany({
    where: { vendor: { districtId: sourceDistrictId } },
    select: { id: true }
  });
  
  // Products stay linked to vendors, so they automatically move with vendors
  console.log(`✅ ${products.length} products moved with vendors`);

  // 3. Move Schools
  const schools = await prisma.schools.findMany({
    where: { districtId: sourceDistrictId },
    select: { id: true }
  });
  
  for (const s of schools) {
    await prisma.schools.update({
      where: { id: s.id },
      data: { districtId: targetDistrictId }
    });
  }
  console.log(`✅ Moved ${schools.length} schools to Shahdol`);

  // 4. Move Service Workers
  const workers = await prisma.serviceWorker.findMany({
    where: { districtId: sourceDistrictId },
    select: { id: true }
  });
  
  for (const w of workers) {
    await prisma.serviceWorker.update({
      where: { id: w.id },
      data: { districtId: targetDistrictId }
    });
  }
  console.log(`✅ Moved ${workers.length} service workers to Shahdol`);

  console.log("\n✅ Migration complete!");
}

migrateToShahdol()
  .then(() => prisma.$disconnect())
  .catch(console.error);