// Umaria District Seed Data
// Run this to create test data for the Umaria district

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Umaria district data...');

  // 1. Create Umaria district if not exists
  let umaria = await prisma.district.findUnique({
    where: { slug: 'umaria' }
  });

  if (!umaria) {
    umaria = await prisma.district.create({
      data: {
        name: 'Umaria',
        slug: 'umaria',
        state: 'Madhya Pradesh',
        primaryColor: '#10b981', // Emerald green
        isActive: true,
      }
    });
    console.log('✅ Created Umaria district');
  }

  // 2. Create sample vendors for Umaria
  const umariaVendors = [
    {
      name: 'Umaria Medical Store',
      slug: 'umaria-medical-store',
      description: 'Best medical supplies in Umaria',
      address: 'Station Road, Umaria',
      phone: '9999999991',
      businessType: 'RETAIL' as any,
      type: 'SHOP' as any,
      category: 'Pharmacy',
      districtId: umaria.id,
      status: 'APPROVED' as any,
      isVerified: true,
      dsslScore: 95,
    },
    {
      name: 'Umaria General Store',
      slug: 'umaria-general-store',
      description: 'General items and groceries',
      address: 'Main Market, Umaria',
      phone: '9999999992',
      businessType: 'RETAIL' as any,
      type: 'SHOP' as any,
      category: 'General Store',
      districtId: umaria.id,
      status: 'APPROVED' as any,
      isVerified: true,
      dsslScore: 88,
    },
    {
      name: 'Umaria Electronics',
      slug: 'umaria-electronics',
      description: 'Electronics and appliances',
      address: 'Bus Stand, Umaria',
      phone: '9999999993',
      businessType: 'RETAIL' as any,
      type: 'SHOP' as any,
      category: 'Electronics',
      districtId: umaria.id,
      status: 'PENDING' as any,
      isVerified: false,
      dsslScore: 75,
    },
  ];

  for (const vendor of umariaVendors) {
    const existing = await prisma.vendor.findFirst({
      where: { slug: vendor.slug, districtId: umaria.id }
    });
    
    if (!existing) {
      await prisma.vendor.create({ data: vendor });
      console.log(`✅ Created vendor: ${vendor.name}`);
    }
  }

  // 3. Create sample hospitals for Umaria
  const umariaHospitals = [
    {
      name: 'Umaria District Hospital',
      slug: 'umaria-district-hospital',
      address: 'Hospital Road, Umaria',
      phone: '9999999901',
      emergencyPhone: '9999999902',
      hospitalType: 'general',
      totalBeds: 50,
      availableBeds: 15,
      is24x7: true,
      districtId: umaria.id,
    },
    {
      name: 'Sharma Nursing Home',
      slug: 'sharma-nursing-home',
      address: 'Gandhi Chowk, Umaria',
      phone: '9999999903',
      hospitalType: 'nursing_home',
      totalBeds: 20,
      availableBeds: 8,
      is24x7: false,
      districtId: umaria.id,
    },
  ];

  for (const hospital of umariaHospitals) {
    const existing = await prisma.hospital.findFirst({
      where: { slug: hospital.slug }
    });
    
    if (!existing) {
      await prisma.hospital.create({ data: hospital });
      console.log(`✅ Created hospital: ${hospital.name}`);
    }
  }

  // 4. Create sample service workers for Umaria
  const umariaServices = [
    {
      name: 'Ramesh Plumber',
      slug: 'ramesh-plumber-umaria',
      phone: '8889999901',
      address: 'Ward 5, Umaria',
      serviceType: 'plumber',
      isAvailable: true,
      serviceArea: 'Umaria, Katni',
      experience: 8,
      rating: 4.5,
      districtId: umaria.id,
    },
    {
      name: 'Suresh Electrician',
      slug: 'suresh-electrician-umaria',
      phone: '8889999902',
      address: 'Ward 3, Umaria',
      serviceType: 'electrician',
      isAvailable: true,
      serviceArea: 'Umaria',
      experience: 12,
      rating: 4.8,
      districtId: umaria.id,
    },
  ];

  for (const service of umariaServices) {
    const existing = await prisma.serviceWorker.findFirst({
      where: { slug: service.slug }
    });
    
    if (!existing) {
      await prisma.serviceWorker.create({ data: service });
      console.log(`✅ Created service worker: ${service.name}`);
    }
  }

  // 5. Create sample schools for Umaria
  const umariaSchools = [
    {
      name: 'Government High School Umaria',
      slug: 'ghs-umaria',
      description: 'Government secondary school',
      address: 'School Road, Umaria',
      phone: '9999999801',
      businessType: 'SCHOOL' as any,
      category: 'School',
      districtId: umaria.id,
      status: 'APPROVED' as any,
      isVerified: true,
      dsslScore: 90,
    },
    {
      name: 'St. Josephs College Umaria',
      slug: 'st-josephs-umaria',
      description: 'Private ICSE school',
      address: 'Mission Road, Umaria',
      phone: '9999999802',
      businessType: 'SCHOOL' as any,
      category: 'School',
      districtId: umaria.id,
      status: 'APPROVED' as any,
      isVerified: true,
      dsslScore: 92,
    },
  ];

  for (const school of umariaSchools) {
    const existing = await prisma.vendor.findFirst({
      where: { slug: school.slug, districtId: umaria.id }
    });
    
    if (!existing) {
      await prisma.vendor.create({ data: school });
      console.log(`✅ Created school: ${school.name}`);
    }
  }

  console.log('\n🎉 Umaria district seed complete!');
  console.log('\n📊 Verification:');
  console.log(`   - District: ${umaria.name} (${umaria.slug})`);
  console.log(`   - Vendors: ${await prisma.vendor.count({ where: { districtId: umaria.id } })}`);
  console.log(`   - Hospitals: ${await prisma.hospital.count({ where: { districtId: umaria.id } })}`);
  console.log(`   - Service Workers: ${await prisma.serviceWorker.count({ where: { districtId: umaria.id } })}`);
}

main()
  .catch(e => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });