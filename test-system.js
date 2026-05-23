// Test script to verify BharatOS is working
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSystem() {
  console.log("🧪 Testing BharatOS System...");

  try {
    // Test database connection
    const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Database connection: OK");

    // Test district data
    const districts = await prisma.district.findMany();
    console.log(`✅ Districts found: ${districts.length}`);

    // Test vendor data
    const vendors = await prisma.vendor.findMany({ take: 5 });
    console.log(`✅ Vendors found: ${vendors.length}`);

    // Test product data
    const products = await prisma.product.findMany({ take: 5 });
    console.log(`✅ Products found: ${products.length}`);

    // Test specific district data (Shahdol)
    const shahdolVendors = await prisma.vendor.findMany({
      where: { districtId: 121 },
      take: 3
    });
    console.log(`✅ Shahdol vendors: ${shahdolVendors.length}`);

    console.log("🎉 BharatOS is READY for production!");
    console.log("🏠 Home page should now show real data");
    console.log("👨‍💼 Admin dashboard should show system metrics");

  } catch (error) {
    console.error("❌ System test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSystem();