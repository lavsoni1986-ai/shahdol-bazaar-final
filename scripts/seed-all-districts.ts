/**
 * ============================================
 * SEED ALL DISTRICTS - BharatOS
 * ============================================
 * Idempotent seeding script for multi-district setup
 * Run multiple times safely - no duplicate data
 */

import { prisma } from '../server/storage';

const DISTRICTS = [
  { id: 1, name: "Shahdol", slug: "shahdol" },
  // Add more districts as they are created in DB
];

/**
 * Seed a single district with base data
 */
async function seedDistrict(districtId: number, name: string, slug: string) {
  console.log(`\n🌱 Seeding ${name} (ID: ${districtId})...`);

  // Check if vendor already exists
  const existingVendor = await prisma.vendor.findFirst({
    where: { districtId, slug: 'main-vendor' }
  });

  if (!existingVendor) {
    await prisma.vendor.create({
      data: {
        name: `${name} Main Vendor`,
        slug: 'main-vendor',
        status: 'APPROVED',
        districtId,
        isVerified: true,
        isFeatured: true,
      }
    });
    console.log(`✅ Vendor created for ${name}`);
  } else {
    console.log(`⏭️  Vendor already exists for ${name}`);
  }

  // Check if category exists
  const existingCategory = await prisma.category.findFirst({
    where: { districtId, slug: 'general' }
  });

  if (!existingCategory) {
    await prisma.category.create({
      data: {
        name: 'General',
        slug: 'general',
        districtId,
      }
    });
    console.log(`✅ Category created for ${name}`);
  }

  // Seed bus timetable (skip duplicates)
  const existingBuses = await prisma.busTimetable.count({
    where: { districtId }
  });

  if (existingBuses === 0) {
    await prisma.busTimetable.createMany({
      data: [
        { fromCity: 'Shahdol', toCity: 'Rewa', firstBusTime: '05:30 AM', lastBusTime: '08:30 PM', fare: '₹180', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Rewa', firstBusTime: '07:00 AM', lastBusTime: '06:00 PM', fare: '₹250', boardingPoint: 'Shahdol Bus Stand', busType: 'AC', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Umaria', firstBusTime: '06:00 AM', lastBusTime: '07:00 PM', fare: '₹120', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Anuppur', firstBusTime: '05:00 AM', lastBusTime: '06:00 PM', fare: '₹100', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Jabalpur', firstBusTime: '06:30 AM', lastBusTime: '05:00 PM', fare: '₹350', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Jabalpur', firstBusTime: '08:00 AM', lastBusTime: '02:00 PM', fare: '₹450', boardingPoint: 'Shahdol Bus Stand', busType: 'AC', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Satna', firstBusTime: '05:30 AM', lastBusTime: '06:30 PM', fare: '₹200', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Katni', firstBusTime: '06:00 AM', lastBusTime: '05:00 PM', fare: '₹280', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Bilaspur', firstBusTime: '07:00 AM', lastBusTime: '04:00 PM', fare: '₹320', boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily', districtId, isActive: true },
        { fromCity: 'Shahdol', toCity: 'Bhopal', firstBusTime: '05:00 PM', lastBusTime: '05:00 PM', fare: '₹550', boardingPoint: 'Shahdol Bus Stand', busType: 'AC', frequency: 'Daily', districtId, isActive: true },
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${10} bus routes created for ${name}`);
  } else {
    console.log(`⏭️  ${existingBuses} bus routes already exist for ${name}`);
  }

  // Seed service workers (skip duplicates)
  const existingWorkers = await prisma.serviceWorker.count({
    where: { districtId }
  });

  if (existingWorkers === 0) {
    await prisma.serviceWorker.createMany({
      data: [
        {
          name: `${name} Electrician`,
          phone: '9999999991',
          serviceType: 'electrician',
          isAvailable: true,
          districtId,
        },
        {
          name: `${name} Plumber`,
          phone: '9999999992',
          serviceType: 'plumber',
          isAvailable: true,
          districtId,
        },
        {
          name: `${name} Carpenter`,
          phone: '9999999993',
          serviceType: 'carpenter',
          isAvailable: true,
          districtId,
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ Service workers created for ${name}`);
  } else {
    console.log(`⏭️  ${existingWorkers} service workers already exist for ${name}`);
  }

  console.log(`✅ ${name} seeded successfully`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🚀 Starting multi-district seeding...');
  console.log(`📊 Seeding ${DISTRICTS.length} districts`);

  let seeded = 0;
  let skipped = 0;

  for (const district of DISTRICTS) {
    try {
      // Check if district exists
      const existing = await prisma.district.findUnique({
        where: { id: district.id }
      });

      if (!existing) {
        console.log(`⚠️  District ${district.name} (ID: ${district.id}) not found in database - skipping`);
        skipped++;
        continue;
      }

      await seedDistrict(district.id, district.name, district.slug);
      seeded++;
    } catch (error) {
      console.error(`❌ Error seeding ${district.name}:`, error);
    }
  }

  console.log(`\n📈 Seeding complete!`);
  console.log(`   ✅ Seeded: ${seeded} districts`);
  console.log(`   ⏭️  Skipped: ${skipped} districts`);

  // Verify counts per district
  console.log('\n🔍 Verifying data per district...');

  for (const district of DISTRICTS) {
    const vendorCount = await prisma.vendor.count({ where: { districtId: district.id } });
    const busCount = await prisma.busTimetable.count({ where: { districtId: district.id } });
    const workerCount = await prisma.serviceWorker.count({ where: { districtId: district.id } });
    console.log(`   ${district.name}: ${vendorCount} vendors, ${busCount} buses, ${workerCount} workers`);
  }

  console.log('\n🏁 Multi-district seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
