import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyShahdolData() {
  const shahdolId = 121;

  console.log("🔍 Checking Shahdol (ID: 121) Data\n");
  console.log("=".repeat(50));

  // Check if Shahdol district exists
  const district = await prisma.district.findUnique({ where: { id: shahdolId } });
  console.log(`🗺️ District: ${district?.name} (ID: ${district?.id})`);
  console.log(`   Active: ${district?.isActive}`);
  console.log("");

  // Check Vendors/Shops
  const vendors = await prisma.vendor.count({ where: { districtId: shahdolId } });
  console.log(`🏪 Vendors in Shahdol: ${vendors}`);

  // Check Products
  const products = await prisma.product.count({ where: { vendor: { districtId: shahdolId } } });
  console.log(`🛍️ Products in Shahdol: ${products}`);

  // Check Schools
  const schools = await prisma.schools.count({ where: { districtId: shahdolId } });
  console.log(`🎓 Schools in Shahdol: ${schools}`);

  // Check Service Workers
  const workers = await prisma.serviceWorker.count({ where: { districtId: shahdolId } });
  console.log(`🔧 Service Workers in Shahdol: ${workers}`);

  // Check Hospitals
  const hospitals = await prisma.hospital.count({ where: { districtId: shahdolId } });
  console.log(`🏥 Hospitals in Shahdol: ${hospitals}`);

  // Check Bus Routes
  const buses = await prisma.busTimetable.count({ where: { districtId: shahdolId } });
  console.log(`🚌 Bus Routes in Shahdol: ${buses}`);

  console.log("=".repeat(50));

  if (vendors > 0 && products > 0) {
    console.log("\n✅ Shahdol has data! Should display on homepage.");
  } else {
    console.log("\n❌ Shahdol has NO data!");
  }
}

verifyShahdolData()
  .then(() => prisma.$disconnect())
  .catch(console.error);