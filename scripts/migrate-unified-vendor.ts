/**
 * Unified Vendor System - Data Migration Script
 * 
 * This script migrates data from:
 * - Shop -> Vendor (businessType: PRODUCT)
 * - Hospital -> Vendor (businessType: HEALTHCARE)
 * - Lead -> Inquiry (inquiryType: LEAD)
 * 
 * Run with: npx tsx scripts/migrate-unified-vendor.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

async function main() {
  console.log("🚀 Starting Unified Vendor Migration...\n");

  let vendorCount = 0;
  let inquiryCount = 0;

  // ============================================
  // STEP 1: Migrate Shops to Vendors (PRODUCT)
  // ============================================
  console.log("📦 Migrating Shops to Vendors...");

  const shops = await prisma.shop.findMany();
  
  for (const shop of shops) {
    // Generate a unique slug
    let slug = shop.slug || generateSlug(shop.name);
    
    // Check if slug already exists and generate a unique one
    let slugCounter = 1;
    while (await prisma.vendor.findFirst({ where: { slug } })) {
      slug = `${shop.slug || generateSlug(shop.name)}-${slugCounter}`;
      slugCounter++;
    }

    // Check if vendor already exists with legacyShopId
    const existingVendor = await prisma.vendor.findFirst({
      where: { legacyShopId: shop.id }
    });

    if (existingVendor) {
      console.log(`   ⚠️  Vendor already exists for shop: ${shop.name} (skipping)`);
      continue;
    }

    await prisma.vendor.create({
      data: {
        name: shop.name,
        slug: slug,
        description: shop.description,
        logo: shop.image,
        address: shop.address,
        mobile: shop.mobile || shop.phone,
        phone: shop.contactNumber,
        businessType: 'PRODUCT',
        category: shop.category,
        categorySlug: shop.category.toLowerCase().replace(/\s+/g, '-'),
        isVerified: shop.isVerified,
        safetyScore: Math.round((shop.avgRating || 0) * 20),
        legacyShopId: shop.id,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
      }
    });
    vendorCount++;
    console.log(`   ✅ Migrated shop: ${shop.name}`);
  }

  console.log(`   📊 Total shops migrated: ${vendorCount}\n`);

  // ============================================
  // STEP 2: Migrate Hospitals to Vendors (HEALTHCARE)
  // ============================================
  console.log("🏥 Migrating Hospitals to Vendors...");

  const hospitals = await prisma.hospital.findMany();

  for (const hospital of hospitals) {
    // Generate a unique slug
    let slug = hospital.slug || generateSlug(hospital.name);
    
    // Check if slug already exists and generate a unique one
    let slugCounter = 1;
    while (await prisma.vendor.findFirst({ where: { slug } })) {
      slug = `${hospital.slug || generateSlug(hospital.name)}-${slugCounter}`;
      slugCounter++;
    }

    // Check if vendor already exists with legacyHospitalId
    const existingVendor = await prisma.vendor.findFirst({
      where: { legacyHospitalId: hospital.id }
    });

    if (existingVendor) {
      console.log(`   ⚠️  Vendor already exists for hospital: ${hospital.name} (skipping)`);
      continue;
    }

    await prisma.vendor.create({
      data: {
        name: hospital.name,
        slug: slug,
        description: hospital.description,
        logo: hospital.images?.[0] || null,
        address: hospital.address,
        mobile: hospital.contactNumber,
        phone: hospital.email,
        businessType: 'HEALTHCARE',
        category: 'Healthcare',
        specialties: hospital.specialties,
        isHospital: true,
        hospitalData: {
          description: hospital.description,
          contactNumber: hospital.contactNumber,
          email: hospital.email,
          images: hospital.images,
        },
        isVerified: hospital.isVerified,
        safetyScore: 100,
        legacyHospitalId: hospital.id,
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt,
      }
    });
    vendorCount++;
    console.log(`   ✅ Migrated hospital: ${hospital.name}`);
  }

  console.log(`   📊 Total hospitals migrated: ${hospitals.length}\n`);

  // ============================================
  // STEP 3: Migrate Leads to Inquiries (LEAD)
  // ============================================
  console.log("📝 Migrating Leads to Inquiries...");

  const leads = await prisma.lead.findMany();

  for (const lead of leads) {
    // Determine vendorId from shopId
    let vendorId: number | null = null;
    if (lead.shopId) {
      const vendor = await prisma.vendor.findFirst({
        where: { legacyShopId: lead.shopId }
      });
      vendorId = vendor?.id || null;
    }

    await prisma.inquiry.create({
      data: {
        vendorId: vendorId,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        message: lead.message,
        source: lead.source,
        inquiryType: 'LEAD',
        status: mapLeadStatus(lead.status),
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      }
    });
    inquiryCount++;
  }

  console.log(`   ✅ Migrated ${inquiryCount} leads to inquiries\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log("=".repeat(50));
  console.log("✅ Migration Complete!");
  console.log("=".repeat(50));
  console.log(`📦 Total Vendors created: ${vendorCount}`);
  console.log(`📝 Total Inquiries created: ${inquiryCount}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Run: npx prisma db push");
  console.log("2. Restart the server");
  console.log("3. Test /api/vendors and /api/inquiries routes");
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// Helper function to map lead status to inquiry status
function mapLeadStatus(status: string): 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST' {
  switch (status) {
    case 'new': return 'NEW';
    case 'contacted': return 'CONTACTED';
    case 'converted': return 'CONVERTED';
    case 'lost': return 'LOST';
    default: return 'NEW';
  }
}

// Run migration
main()
  .catch((e: any) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
