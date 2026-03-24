/**
 * Database Legacy Patch
 * Ensures ALL existing vendors, inquiries, and analytics without a districtId
 * are automatically assigned to the "Shahdol" district (id: 1).
 * 
 * Run: npx tsx prisma/legacy-district-patch.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting Legacy District Patch...');
  
  // Get or create Shahdol district
  let shahdolDistrict = await prisma.district.findUnique({
    where: { slug: 'shahdol' }
  });
  
  if (!shahdolDistrict) {
    console.log('📦 Creating default Shahdol district...');
    shahdolDistrict = await prisma.district.create({
      data: {
        name: 'Shahdol',
        slug: 'shahdol',
        state: 'Madhya Pradesh',
        primaryColor: '#f97316',
        secondaryColor: '#22c55e',
        isActive: true,
        isDefault: true,
      }
    });
    console.log(`✅ Created Shahdol district with ID: ${shahdolDistrict.id}`);
  } else {
    console.log(`✅ Found Shahdol district with ID: ${shahdolDistrict.id}`);
  }

  const shahdolId = shahdolDistrict.id;

  // Patch Vendors without districtId
  const orphanedVendors = await prisma.vendor.findMany({
    where: { districtId: null }
  });
  
  if (orphanedVendors.length > 0) {
    console.log(`📦 Patching ${orphanedVendors.length} orphaned vendors...`);
    await prisma.vendor.updateMany({
      where: { districtId: null },
      data: { districtId: shahdolId }
    });
    console.log(`✅ Patched ${orphanedVendors.length} vendors to Shahdol district`);
  } else {
    console.log('✅ No orphaned vendors found');
  }

  // Patch Inquiries without districtId
  const orphanedInquiries = await prisma.inquiry.findMany({
    where: { districtId: null }
  });
  
  if (orphanedInquiries.length > 0) {
    console.log(`📦 Patching ${orphanedInquiries.length} orphaned inquiries...`);
    await prisma.inquiry.updateMany({
      where: { districtId: null },
      data: { districtId: shahdolId }
    });
    console.log(`✅ Patched ${orphanedInquiries.length} inquiries to Shahdol district`);
  } else {
    console.log('✅ No orphaned inquiries found');
  }

  // Patch Analytics Events without districtId
  const orphanedAnalytics = await prisma.analyticsEvent.findMany({
    where: { districtId: null }
  });
  
  if (orphanedAnalytics.length > 0) {
    console.log(`📦 Patching ${orphanedAnalytics.length} orphaned analytics events...`);
    await prisma.analyticsEvent.updateMany({
      where: { districtId: null },
      data: { districtId: shahdolId }
    });
    console.log(`✅ Patched ${orphanedAnalytics.length} analytics events to Shahdol district`);
  } else {
    console.log('✅ No orphaned analytics events found');
  }

  // Patch Bus Timetables without districtId
  const orphanedBuses = await prisma.busTimetable.findMany({
    where: { districtId: null }
  });
  
  if (orphanedBuses.length > 0) {
    console.log(`📦 Patching ${orphanedBuses.length} orphaned bus timetables...`);
    await prisma.busTimetable.updateMany({
      where: { districtId: null },
      data: { districtId: shahdolId }
    });
    console.log(`✅ Patched ${orphanedBuses.length} bus timetables to Shahdol district`);
  } else {
    console.log('✅ No orphaned bus timetables found');
  }

  console.log('🎉 Legacy District Patch Complete! All data is now assigned to Shahdol district.');
}

main()
  .catch((e) => {
    console.error('❌ Legacy patch failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
