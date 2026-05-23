/**
 * Database Diagnostic Script
 * Checks data for districtId: 121 (Shahdol)
 */

import "dotenv/config";
import { prisma } from "../server/storage.js";

async function runDiagnostics() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DATABASE DIAGNOSTIC REPORT - District 121 (Shahdol)");
  console.log("=".repeat(60) + "\n");

  try {
    // ============================================
    // 1. DISTRICT CHECK
    // ============================================
    console.log("📍 DISTRICT CHECK");
    console.log("-".repeat(40));
    
    const district = await prisma.district.findUnique({
      where: { id: 121 }
    });
    
    if (district) {
      console.log(`✅ District ID 121 found:`);
      console.log(`   Name: ${district.name}`);
      console.log(`   Slug: ${district.slug}`);
      console.log(`   State: ${district.state}`);
      console.log(`   Active: ${district.isActive}`);
    } else {
      console.log(`❌ District ID 121 NOT FOUND`);
    }

    // ============================================
    // 2. VENDOR CHECK
    // ============================================
    console.log("\n🏪 VENDOR CHECK");
    console.log("-".repeat(40));

    // Total vendors for district 121
    const totalVendors = await prisma.vendor.count({
      where: { districtId: 121 }
    });
    console.log(`📊 TOTAL vendors for districtId 121: ${totalVendors}`);

    // Vendors with status APPROVED (enum - uppercase)
    const approvedVendors = await prisma.vendor.count({
      where: { 
        districtId: 121,
        status: "APPROVED" as any
      }
    });
    console.log(`✅ Vendors with status = 'APPROVED': ${approvedVendors}`);

    // Vendors with PENDING status
    const pendingVendors = await prisma.vendor.count({
      where: { 
        districtId: 121,
        status: "PENDING" as any
      }
    });
    console.log(`⏳ Vendors with status = 'PENDING': ${pendingVendors}`);

    // First 3 vendors - show ID and status
    const firstVendors = await prisma.vendor.findMany({
      where: { districtId: 121 },
      take: 3,
      select: { id: true, name: true, status: true }
    });
    console.log(`\n📋 First 3 vendors:`);
    for (const v of firstVendors) {
      console.log(`   ID: ${v.id}, Name: ${v.name}, Status: ${v.status}`);
    }

    // ============================================
    // 3. PRODUCT CHECK
    // ============================================
    console.log("\n📦 PRODUCT CHECK");
    console.log("-".repeat(40));

    // Products with direct districtId
    const directProducts = await prisma.product.count({
      where: { districtId: 121 }
    });
    console.log(`📊 Products with direct districtId 121: ${directProducts}`);

    // Products through vendor
    const vendorProducts = await prisma.product.count({
      where: { vendor: { districtId: 121 } }
    });
    console.log(`📊 Products via vendor relationship (vendor.districtId = 121): ${vendorProducts}`);

    // Combined total
    const totalProducts = await prisma.product.count({
      where: { 
        OR: [
          { districtId: 121 },
          { vendor: { districtId: 121 } }
        ]
      }
    });
    console.log(`📊 TOTAL products (combined): ${totalProducts}`);

    // Products with approved = true
    const approvedProducts = await prisma.product.count({
      where: { 
        approved: true,
        OR: [
          { districtId: 121 },
          { vendor: { districtId: 121 } }
        ]
      }
    });
    console.log(`✅ Products with approved = true: ${approvedProducts}`);

    // First 3 products
    const firstProducts = await prisma.product.findMany({
      where: { vendor: { districtId: 121 } },
      take: 3,
      select: { id: true, title: true, approved: true, status: true }
    });
    console.log(`\n📋 First 3 products (via vendor 121):`);
    for (const p of firstProducts) {
      console.log(`   ID: ${p.id}, Title: ${p.title}, Approved: ${p.approved}, Status: ${p.status}`);
    }

    // ============================================
    // 4. HOSPITALS CHECK
    // ============================================
    console.log("\n🏥 HOSPITALS CHECK");
    console.log("-".repeat(40));

    const totalHospitals = await prisma.hospital.count({
      where: { districtId: 121 }
    });
    console.log(`📊 TOTAL hospitals for districtId 121: ${totalHospitals}`);

    // ============================================
    // 5. BUSES CHECK
    // ============================================
    console.log("\n🚌 BUSES CHECK");
    console.log("-".repeat(40));

    const totalBuses = await prisma.busTimetable.count({
      where: { districtId: 121 }
    });
    console.log(`📊 TOTAL BusTimetable records for districtId 121: ${totalBuses}`);

    // ============================================
    // 6. SCHOOLS CHECK
    // ============================================
    console.log("\n🏫 SCHOOLS CHECK");
    console.log("-".repeat(40));

    const totalSchools = await prisma.schools.count({
      where: { districtId: 121 }
    });
    console.log(`📊 TOTAL schools for districtId 121: ${totalSchools}`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📋 SUMMARY");
    console.log("=".repeat(60));
    console.log(`
    District 121:      ${district ? "✅ EXISTS" : "❌ NOT FOUND"}
    Total Vendors:     ${totalVendors}
    Approved Vendors:  ${approvedVendors}
    Pending Vendors:    ${pendingVendors}
    Total Products:    ${totalProducts}
    Approved Products: ${approvedProducts}
    Total Hospitals:   ${totalHospitals}
    Total Buses:       ${totalBuses}
    Total Schools:      ${totalSchools}
    `);

    // Issues
    if (totalVendors > 0 && approvedVendors === 0) {
      console.log("\n⚠️  WARNING: Vendors exist but NONE are APPROVED!");
      console.log("   Backend filters by status = 'APPROVED', so frontend shows 0.");
      console.log("   FIX: Run UPDATE query to set status = 'APPROVED'");
    }

    if (totalProducts > 0 && approvedProducts === 0) {
      console.log("\n⚠️  WARNING: Products exist but NONE are approved!");
      console.log("   Products need approved = true to show in marketplace");
      console.log("   FIX: Run UPDATE query to set approved = true");
    }

    if (totalVendors === 0 && totalProducts === 0 && totalHospitals === 0 && totalSchools === 0) {
      console.log("\n⚠️  WARNING: NO DATA for district 121!");
      console.log("   No vendors, products, hospitals, or schools found.");
      console.log("   FIX: Seed data for Shahdol district");
    }

  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();