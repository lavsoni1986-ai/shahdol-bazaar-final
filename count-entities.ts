import { prisma } from "./server/storage";

async function countEntities() {
  try {
    const vendorCount = await prisma.vendor.count();
    const productCount = await prisma.product.count();
    const serviceWorkerCount = await prisma.serviceWorker.count();

    const businessTypes = await prisma.vendor.groupBy({
      by: ['businessType'],
      _count: { id: true }
    });

    console.log(`Total Vendors: ${vendorCount}`);
    console.log(`Total Products: ${productCount}`);
    console.log(`Total Service Workers: ${serviceWorkerCount}`);

    console.log("Vendor Business Types:");
    businessTypes.forEach(type => {
      console.log(`  ${type.businessType}: ${type._count.id}`);
    });

    const hospitalCount = await prisma.vendor.count({
      where: { businessType: "HEALTHCARE" }
    });
    console.log(`Hospitals (HEALTHCARE): ${hospitalCount}`);
  } catch (error) {
    console.error("Error counting entities:", error);
  } finally {
    await prisma.$disconnect();
  }
}

countEntities();