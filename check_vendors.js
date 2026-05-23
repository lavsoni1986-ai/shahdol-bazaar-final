import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVendors() {
  const vendors = await prisma.vendor.findMany({
    take: 20,
    select: {
      id: true,
      name: true,
      searchText: true,
      aiRankScore: true,
      rating: true,
      dsslScore: true,
      isShadowBanned: true,
    },
  });
  console.log('Vendor data:', vendors);
  await prisma.$disconnect();
}

checkVendors().catch(console.error);