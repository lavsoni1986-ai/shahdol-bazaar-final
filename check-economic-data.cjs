const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany();
  console.log('Vendors:', vendors.map(x => ({id: x.id, name: x.name, slug: x.slug, isAiIndexed: x.isAiIndexed})));

  const products = await prisma.product.findMany();
  console.log('Products:', products.map(x => ({id: x.id, title: x.title, isAiIndexed: x.isAiIndexed})));

  const services = await prisma.serviceWorker.findMany();
  console.log('Services:', services.map(x => ({id: x.id, name: x.name})));

  const hospitals = await prisma.hospital.findMany();
  console.log('Hospitals:', hospitals.map(x => ({id: x.id, name: x.name})));

  const schools = await prisma.schools.findMany();
  console.log('Schools:', schools.map(x => ({id: x.id, name: x.name})));
}

main().finally(() => prisma.$disconnect());