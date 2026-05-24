import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function test() {
  console.log("🔍 Testing DB trigger for product slugs...");
  
  // Find a valid vendor to avoid foreign key violations
  const firstVendor = await prisma.vendor.findFirst({ select: { id: true, districtId: true } });
  if (!firstVendor) {
    console.error("❌ No vendor found in database. Cannot run test.");
    return;
  }
  
  console.log(`Found vendor ID: ${firstVendor.id}, District ID: ${firstVendor.districtId}`);
  
  // Insert a product with slug = null
  const product = await prisma.product.create({
    data: {
      title: "Vision Pro Premium Headset!!!",
      vendorId: firstVendor.id,
      districtId: firstVendor.districtId,
      price: 349900,
      stock: 5,
      slug: null // explicitly null to test trigger
    }
  });
  
  console.log("✅ Product inserted successfully!");
  console.log(`Product ID: ${product.id}`);
  console.log(`Product Title: "${product.title}"`);
  console.log(`Generated Slug in DB: "${product.slug}"`);
  
  // Verify that slug matches the expected format (vision-pro-premium-headset)
  if (product.slug === "vision-pro-premium-headset") {
    console.log("🎉 SUCCESS: DB-level trigger correctly generated the slug!");
  } else {
    console.error("❌ FAILURE: Slug does not match expected value.");
  }
  
  // Clean up
  await prisma.product.delete({ where: { id: product.id } });
  console.log("🧹 Cleaned up test product.");
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
