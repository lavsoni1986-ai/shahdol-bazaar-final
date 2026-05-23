import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  const totalVendors = await prisma.vendor.count();
  const approvedVendors = await prisma.vendor.count({
    where: { status: 'APPROVED' }
  });
  const hospitalVendors = await prisma.vendor.count({
    where: { category: 'HOSPITAL' }
  });
  const districtVendors = await prisma.vendor.count({
    where: { districtId: 1 }
  });
  const totalProducts = await prisma.product.count();

  console.log('Counts:', {
    totalVendors,
    approvedVendors,
    hospitalVendors,
    districtVendors,
    totalProducts
  });

  await prisma.$disconnect();
}

checkCounts().catch(console.error);