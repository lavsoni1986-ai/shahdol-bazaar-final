// check-db.ts - Database Integrity Check Script
// Run with: npx tsx check-db.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function runAutoTest() {
  console.log("🔍 Starting Automated Data Sync Test...\n");
  let errorCount = 0;
  let warnCount = 0;

  try {
    // 1. Check Product Price Mapping & Logic
    console.log("📦 Checking Product Price Logic...");
    const products = await prisma.product.findMany({
      include: { vendor: true }
    });
    
    products.forEach(p => {
      if (p.originalPrice && p.sellingPrice > p.originalPrice) {
        console.error(`❌ Logic Error: Product "${p.name}" (ID: ${p.id}) - Selling Price (₹${p.sellingPrice}) is higher than MRP (₹${p.originalPrice})!`);
        errorCount++;
      }
      if (p.sellingPrice <= 0) {
        console.error(`❌ Zero Price Error: Product "${p.name}" (ID: ${p.id}) has price: ${p.sellingPrice}`);
        errorCount++;
      }
    });
    
    if (products.length === 0) {
      console.log("⚠️ No products found in database.");
    } else {
      console.log(`✅ Checked ${products.length} products.\n`);
    }

    // 2. Check Vendor-User Linking (Dead Links)
    console.log("👤 Checking Vendor-User Linking...");
    const orphans = await prisma.vendor.findMany({
      where: { userId: null },
      include: { products: true }
    });
    
    if (orphans.length > 0) {
      console.warn(`⚠️ Found ${orphans.length} vendors WITHOUT a linked User account!`);
      orphans.forEach(v => {
        console.warn(`   - Vendor ID: ${v.id}, Name: ${v.shopName}, Products: ${v.products.length}`);
      });
      warnCount += orphans.length;
    } else {
      console.log("✅ All vendors are properly linked to users.\n");
    }

    // 3. Check Unapproved Vendors
    console.log("🏪 Checking Vendor Status...");
    const pendingVendors = await prisma.vendor.findMany({
      where: { status: 'PENDING' },
      select: { id: true, shopName: true, userId: true }
    });
    
    if (pendingVendors.length > 0) {
      console.log(`📋 Found ${pendingVendors.length} PENDING vendors waiting for approval:`);
      pendingVendors.forEach(v => {
        console.log(`   - ID: ${v.id}, Shop: ${v.shopName}, UserID: ${v.userId}`);
      });
    } else {
      console.log("✅ No pending vendors.\n");
    }

    // 4. Check Approved Vendors
    const approvedVendors = await prisma.vendor.findMany({
      where: { status: 'APPROVED' },
      include: { products: true }
    });
    
    console.log(`✅ Found ${approvedVendors.length} APPROVED vendors.`);
    let totalProducts = approvedVendors.reduce((acc, v) => acc + v.products.length, 0);
    console.log(`   Total products from approved vendors: ${totalProducts}\n`);

    // 5. Check Rejected Vendors
    const rejectedVendors = await prisma.vendor.count({
      where: { status: 'REJECTED' }
    });
    console.log(`📊 Rejected vendors: ${rejectedVendors}\n`);

    // 6. Check for products from UNAPPROVED vendors
    console.log("🔒 Checking for products from unapproved vendors (SECURITY CHECK)...");
    const unapprovedProducts = await prisma.product.findMany({
      where: {
        vendor: { status: { not: 'APPROVED' } }
      },
    });
    
    if (unapprovedProducts.length > 0) {
      console.warn(`⚠️ SECURITY ALERT: Found ${unapprovedProducts.length} products from UNAPPROVED vendors!`);
      warnCount += unapprovedProducts.length;
    } else {
      console.log("✅ No products from unapproved vendors found.\n");
    }

    // 7. Check for Zombie Records (Products with deleted vendors)
    console.log("🧟 Checking for Zombie Records (Foreign Key Integrity)...");
    const allVendors = await prisma.vendor.findMany({ select: { id: true } });
    const validVendorIds = new Set(allVendors.map(v => v.id));
    
    let zombieCount = 0;
    for (const product of products) {
      if (product.vendorId && !validVendorIds.has(product.vendorId)) {
        console.warn(`🧟 Zombie Product: ID=${product.id}, Name="${product.name}", Orphaned vendorId=${product.vendorId}`);
        zombieCount++;
      }
    }
    
    if (zombieCount > 0) {
      console.warn(`⚠️ Found ${zombieCount} zombie products (orphan vendorId references)!`);
      warnCount += zombieCount;
    } else {
      console.log("✅ No zombie records found - Foreign Key integrity is good.\n");
    }

    // 7. Summary
    console.log("=".repeat(50));
    console.log("📊 DATA INTEGRITY SUMMARY");
    console.log("=".repeat(50));
    console.log(`🔴 Errors Found: ${errorCount}`);
    console.log(`🟡 Warnings: ${warnCount}`);
    console.log(`🟢 Total Products: ${products.length}`);
    console.log(`🟢 Total Vendors: ${pendingVendors.length + approvedVendors.length + rejectedVendors}`);
    console.log("=".repeat(50));
    
    if (errorCount === 0 && warnCount === 0) {
      console.log("🎉 DATABASE IS CLEAN AND HEALTHY!");
    } else if (errorCount === 0) {
      console.log("⚠️ Database has warnings - review above.");
    } else {
      console.log("❌ Database has critical errors - fix immediately!");
    }

  } catch (error) {
    console.error("❌ Error running database check:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runAutoTest();
