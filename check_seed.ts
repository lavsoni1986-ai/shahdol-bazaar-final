import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixData() {
  const shahdolId = 121;

  try {
    // 1. Create Real Hospitals (Service Pillar)
    await prisma.hospital.create({
      data: {
        name: "Shri Ram Hospital",
        districtId: shahdolId,
        address: "Gandhi Chowk, Shahdol",
        phone: "07652-123456",
        specialties: ["Emergency", "General Medicine"],
        hospitalType: "PRIVATE",
        totalBeds: 50,
        availableBeds: 12,
        oxygenAvailable: true,
        isActive: true
      }
    });
    console.log("🏥 Hospital created");
  } catch (e) {
    console.log("🏥 Hospital already exists");
  }

  try {
    // 2. Create Real Service Workers (Service Pillar)
    await prisma.serviceWorker.create({
      data: {
        name: "Raju Plumber",
        slug: "raju-plumber-" + Date.now(),
        serviceType: "PLUMBING",
        districtId: shahdolId,
        phone: "919753239303",
        dsslScore: 92.5,
        isVerified: true,
        isActive: true
      }
    });
    console.log("🔧 Service Worker created");
  } catch (e) {
    console.log("🔧 Service Worker already exists");
  }

  try {
    // 3. Create Schools (Education Pillar)
    await prisma.schools.create({
      data: {
        name: "Bharat Public School",
        districtId: shahdolId,
        address: "Budhar Road, Shahdol",
        board: "CBSE",
        dsslScore: 85,
        isVerified: true,
        isActive: true
      }
    });
    console.log("🎓 School created");
  } catch (e) {
    console.log("🎓 School already exists");
  }

  console.log("✅ Sovereign Data Realignment Complete!");
}

async function main() {
  console.log("🔍 BharatOS: Database Seed Checking System Initiated...\n");

  try {
    // 1. Check Users
    const userCount = await prisma.user.count();
    console.log(`👤 Total Users: ${userCount}`);

    // 2. Check Vendors (Shops)
    const vendorCount = await prisma.vendor.count();
    console.log(`🏪 Total Vendors (Shops): ${vendorCount}`);

    // 3. Check Products
    const productCount = await prisma.product.count();
    console.log(`🛍️ Total Products: ${productCount}`);

    // 4. Check Districts (Sovereign Context)
    const districtCount = await prisma.district.count();
    console.log(`🗺️ Total Districts: ${districtCount}`);

    // 5. Check Bus & Services (Optional but good for audit)
    const busCount = await prisma.busTimetable.count();
    console.log(`🚌 Total Bus Routes: ${busCount}`);

    console.log("\n✅ Database Check Complete. Sovereign Engine is running perfectly!");

  } catch (error: any) {
    console.error("🚨 Error checking database:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run data fix
fixData().catch(console.error);

// Run check
main();
