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
        searchText: searchText,
        dsslScore: vendor.dsslScore || 50,
        aiRankScore: vendor.dsslScore || 50
      }
    });
  }

  console.log(`✅ Updated ${vendors.length} vendors`);
}

fixVendorData().catch(console.error).finally(() => prisma.$disconnect());