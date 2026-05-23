import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVendors() {
  console.log('🔍 Checking Vendor slugs and IDs...\n');

  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      districtId: true,
      status: true
    },
    take: 50
  });

  // Check if any IDs are UUID format
  console.log('\n🔍 Checking for UUID IDs:');
  vendors.forEach(v => {
    if (v.id.toString().includes('-')) {
      console.log(`❌ UUID ID found: ${v.id} for ${v.name}`);
    }
  });

  console.log('📊 Sample Vendors:');
  vendors.forEach(v => {
    console.log(`ID: ${v.id}`);
    console.log(`Slug: ${v.slug || '❌ MISSING'}`);
    console.log(`Name: ${v.name}`);
    console.log(`District: ${v.districtId}`);
    console.log(`Status: ${v.status}`);
    console.log('---');
  });

  // Check for duplicates
  const slugCounts = {};
  vendors.forEach(v => {
    if (v.slug) {
      slugCounts[v.slug] = (slugCounts[v.slug] || 0) + 1;
    }
  });

  console.log('\n🔍 Slug uniqueness check:');
  Object.entries(slugCounts).forEach(([slug, count]) => {
    if (count > 1) {
      console.log(`❌ Duplicate slug: ${slug} (${count} times)`);
    }
  });

  if (Object.values(slugCounts).every(count => count === 1)) {
    console.log('✅ All slugs are unique');
  }

  // Check for missing slugs
  const missingSlugs = vendors.filter(v => !v.slug).length;
  console.log(`\n❌ Vendors missing slugs: ${missingSlugs}`);

  await prisma.$disconnect();
}

checkVendors().catch(console.error);