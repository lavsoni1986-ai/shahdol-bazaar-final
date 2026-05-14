import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed District
  const district = await prisma.district.upsert({
    where: { slug: 'shahdol' },
    update: {},
    create: {
      name: 'Shahdol',
      slug: 'shahdol',
      state: 'Madhya Pradesh',
      primaryColor: '#f97316',
      secondaryColor: '#22c55e',
      isActive: true,
      isDefault: true,
      metaTitle: 'Shahdol Bazaar - Local Marketplace',
      metaDescription: 'Discover local businesses in Shahdol',
    },
  });

  // Seed Vendors
  const vendors = [
    {
      name: 'Apollo Hospital Shahdol',
      slug: 'apollo-hospital-shahdol',
      district: { connect: { id: district.id } },
      status: 'APPROVED',
      isVerified: true,
      isShadowBanned: false,
      category: 'HOSPITAL',
      categorySlug: 'hospital',
      searchText: 'Apollo Hospital Shahdol healthcare medical emergency ICU beds oxygen',
      aiRankScore: 0.95,
      rating: 4.5,
      dsslScore: 95,
      trendingScore: 150,
      businessType: 'HEALTHCARE',
      description: 'Leading hospital in Shahdol with 24/7 emergency services',
      address: 'Main Road, Shahdol',
      phone: '+91-1234567890',
      images: ['hospital1.jpg'],
      specialties: ['Cardiology', 'Orthopedics'],
      isHospital: true,
      hospitalData: {
        availableBeds: 50,
        emergencyBedCount: 10,
        icuAvailable: true,
        oxygenAvailable: true
      },
    },
    {
      name: 'City Medical Store',
      slug: 'city-medical-store',
      district: { connect: { id: district.id } },
      status: 'APPROVED',
      isVerified: true,
      isShadowBanned: false,
      category: 'PHARMACY',
      categorySlug: 'pharmacy',
      searchText: 'City Medical Store pharmacy medicines drugs healthcare',
      aiRankScore: 0.85,
      rating: 4.2,
      dsslScore: 80,
      trendingScore: 100,
      businessType: 'PRODUCT',
      description: 'Your trusted pharmacy for all medical needs',
      address: 'Market Square, Shahdol',
      phone: '+91-9876543210',
    },
    // Add more vendors...
  ];

  const createdVendors = [];
  for (const vendorData of vendors) {
    const vendor = await prisma.vendor.create({
      data: vendorData,
    });
    createdVendors.push(vendor);
  }

  // Add semantically correct vendors for electronics domain (non-destructive)
  vendors.push(
    {
      name: 'Shahdol Electronics Store',
      slug: 'electronics-store-shahdol',
      district: { connect: { id: district.id } },
      status: 'APPROVED',
      isVerified: true,
      isShadowBanned: false,
      category: 'ELECTRONICS_STORE',
      categorySlug: 'electronics-store',
      searchText: 'electronics store mobile laptop tv accessories shahdol',
      aiRankScore: 0.7,
      rating: 4.1,
      dsslScore: 70,
      trendingScore: 20,
      businessType: 'PRODUCT',
      description: 'Authorized electronics retailer',
      address: 'Electronics Market, Shahdol',
      phone: '+91-9000000001',
      images: ['electronics1.jpg'],
    },
    {
      name: 'Shahdol Mobile Repair',
      slug: 'electronics-repair-shahdol',
      district: { connect: { id: district.id } },
      status: 'APPROVED',
      isVerified: false,
      isShadowBanned: false,
      category: 'ELECTRONICS_REPAIR',
      categorySlug: 'electronics-repair',
      searchText: 'mobile repair phone repair service center shahdol',
      aiRankScore: 0.6,
      rating: 3.9,
      dsslScore: 60,
      trendingScore: 10,
      businessType: 'SERVICE',
      description: 'Local mobile and electronics repair shop',
      address: 'Service Lane, Shahdol',
      phone: '+91-9000000002',
      images: ['repair1.jpg'],
    }
  );

  // Seed Products
  const products = [
    {
      title: 'Boat Rockerz Headphones',
      description: 'Wireless headphones with great sound quality',
      imageUrl: 'headphones.jpg',
      // vendor connect will be corrected to a semantically appropriate electronics store below
      district: { connect: { id: district.id } },
      approved: true,
      status: 'active',
      categoryName: 'Electronics',
      mrp: 2999,
      price: 2499,
      stock: 50,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      vectorEmbedding: { test: 'embedding' },
    },
    // Add more products...
  ];

  for (const productData of products) {
    await prisma.product.create({
      data: productData,
    });
  }

  // Non-destructive fix: reassign misgrounded products to semantically correct vendors
  // Find the electronics store we created and reassign any products that belong to electronics but are currently linked to wrong vendors
  const electronicsStore = await prisma.vendor.findUnique({ where: { slug: 'electronics-store-shahdol' } });
  if (electronicsStore) {
    await prisma.product.updateMany({
      where: { title: 'Boat Rockerz Headphones' },
      data: {
        vendorId: electronicsStore.id,
        categoryName: 'Electronics'
      }
    });
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });