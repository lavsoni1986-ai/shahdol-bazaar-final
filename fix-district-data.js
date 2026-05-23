/**
 * 🚀 DATABASE FIX SCRIPT
 * Run this script to fix district data isolation issues
 */

import { prisma } from '../server/storage.js';

async function fixDistrictData() {
  console.log('🔧 Starting district data fixes...');

  try {
    // ✅ FIX 1: Set districtId = 121 for all vendors that don't have it
    console.log('📍 Fix 1: Updating vendors without districtId...');
    const vendorUpdate = await prisma.vendor.updateMany({
      where: { districtId: null },
      data: { districtId: 121 }
    });
    console.log(`✅ Updated ${vendorUpdate.count} vendors`);

    // ✅ FIX 2: Link products to vendors with correct district
    console.log('📦 Fix 2: Linking products to district vendors...');
    const productsToUpdate = await prisma.product.findMany({
      where: { vendorId: null }
    });

    let productUpdateCount = 0;
    for (const product of productsToUpdate) {
      const vendor = await prisma.vendor.findFirst({
        where: { districtId: 121 },
        select: { id: true }
      });

      if (vendor) {
        await prisma.product.update({
          where: { id: product.id },
          data: { vendorId: vendor.id }
        });
        productUpdateCount++;
      }
    }
    console.log(`✅ Updated ${productUpdateCount} products`);

    // ✅ VERIFICATION
    console.log('\n📊 VERIFICATION RESULTS:');

    const totalVendors = await prisma.vendor.count();
    console.log(`Total vendors: ${totalVendors}`);

    const shahdolVendors = await prisma.vendor.count({
      where: { districtId: 121 }
    });
    console.log(`Shahdol vendors: ${shahdolVendors}`);

    const productsWithVendors = await prisma.product.count({
      where: { vendorId: { not: null } }
    });
    console.log(`Products with vendors: ${productsWithVendors}`);

    console.log('\n🎉 District data fixes completed!');

  } catch (error) {
    console.error('❌ Error during fixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fixes
fixDistrictData().catch(console.error);