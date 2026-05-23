import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const vendors = await prisma.vendor.findMany({
      select: { id: true, name: true, slug: true, status: true },
      take: 5
    });

    console.log('Vendors found:');
    vendors.forEach(v => {
      console.log(`- ID: ${v.id}, Name: ${v.name}, Slug: ${v.slug}, Status: ${v.status}`);
    });

    const products = await prisma.product.findMany({
      select: { id: true, title: true, slug: true, approved: true },
      take: 5
    });

    console.log('\nProducts found:');
    products.forEach(p => {
      console.log(`- ID: ${p.id}, Title: ${p.title}, Slug: ${p.slug}, Approved: ${p.approved}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();