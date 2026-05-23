const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bootstrapping first economic entities...');

  // 1. Create first vendor
  const vendor = await prisma.vendor.create({
    data: {
      name: 'Shree Ram Electronics',
      slug: 'shree-ram-electronics',
      category: 'SERVICE',
      districtId: 1,
      address: 'Main Market, Shahdol',
      phone: '+91-9876543210',
      description: 'Your trusted electronics store in Shahdol',
      status: 'APPROVED',
      isVerified: true,
      rating: 4.5,
      reviewCount: 25,
      isAiIndexed: true,
      searchText: 'electronics shop electronic store gadgets headphones speakers mobiles phones chargers cables shree ram',
      aiRankScore: 85.5
    }
  });

  console.log('✅ Created vendor:', vendor.name);

  // 2. Create first product
  const product = await prisma.product.create({
    data: {
      title: 'Boat Rockerz Headphones',
      slug: 'boat-rockerz-headphones',
      description: 'Wireless Bluetooth headphones with amazing sound quality',
      price: 1999,
      mrp: 2999,
      vendorId: vendor.id,
      approved: true,
      status: 'approved',
      stock: 50,
      categoryName: 'Electronics',
      isTrending: true,
      isAiIndexed: true,
      searchText: 'boat rockerz headphones wireless bluetooth earphones audio music sound electronics gadget',
      aiRankScore: 78.2
    }
  });

  console.log('✅ Created product:', product.title);

  // 3. Create first service worker
  const serviceWorker = await prisma.serviceWorker.create({
    data: {
      name: 'Raju Electrician',
      slug: 'raju-electrician',
      phone: '+91-8765432109',
      districtId: 1,
      serviceType: 'ELECTRICIAN',
      address: 'Near Bus Stand, Shahdol',
      description: 'Professional electrician services for homes and businesses',
      isAvailable: true,
      skillTags: ['wiring', 'repairs', 'installations', 'electrical', 'maintenance'],
      rating: 4.2,
      reviewCount: 15,
      isVerified: true,
      searchText: 'electrician electrical repair wiring installation maintenance power electricity raju'
    }
  });

  console.log('✅ Created service worker:', serviceWorker.name);

  // 4. Create a hospital for medical services
  const hospital = await prisma.hospital.create({
    data: {
      name: 'Shree Ram Hospital',
      slug: 'shree-ram-hospital',
      districtId: 1,
      address: 'Civil Lines, Shahdol',
      phone: '+91-9876543211',
      description: 'Multi-specialty hospital with 24/7 emergency services',
      isActive: true,
      services: ['emergency', 'cardiology', 'orthopedics', 'general medicine'],
      rating: 4.1,
      reviewCount: 89
    }
  });

  console.log('✅ Created hospital:', hospital.name);

  // 5. Create a school for education services
  const school = await prisma.schools.create({
    data: {
      name: 'Govt Higher Secondary School',
      slug: 'govt-higher-secondary-school',
      districtId: 1,
      address: 'Main Road, Shahdol',
      phone: '+91-8765432110',
      description: 'Government school offering classes 1-12',
      isActive: true,
      type: 'GOVERNMENT',
      board: 'CBSE',
      classesOffered: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      facilities: ['library', 'laboratory', 'sports ground'],
      rating: 3.8,
      reviewCount: 45
    }
  });

  console.log('✅ Created school:', school.name);

  console.log('\n🎉 Economic graph activated!');
  console.log('📊 Current entity counts:');
  const [vendorCount, productCount, serviceCount, hospitalCount, schoolCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.serviceWorker.count(),
    prisma.hospital.count(),
    prisma.schools.count()
  ]);

  console.log(`- Vendors: ${vendorCount}`);
  console.log(`- Products: ${productCount}`);
  console.log(`- Services: ${serviceCount}`);
  console.log(`- Hospitals: ${hospitalCount}`);
  console.log(`- Schools: ${schoolCount}`);
  console.log(`- Total Economic Entities: ${vendorCount + productCount + serviceCount + hospitalCount + schoolCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });