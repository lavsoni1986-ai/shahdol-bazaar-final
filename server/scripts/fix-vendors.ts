import { prisma } from '../storage';

async function fixVendorData() {
  console.log('🔧 Fixing vendor data for AI search...');

  const vendors = await prisma.vendor.findMany();

  for (const vendor of vendors) {
    const searchText = `${vendor.name} ${vendor.category}`.toLowerCase();

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        status: 'APPROVED',
        isAiIndexed: true,
        searchText: searchText,
        dsslScore: vendor.trustScore || 50,
        aiRankScore: vendor.trustScore || 50
      }
    });
  }

  console.log(`✅ Updated ${vendors.length} vendors`);
}

fixVendorData().catch(console.error).finally(() => prisma.$disconnect());