const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const districts = await prisma.$queryRaw`SELECT id, name, slug FROM "District" ORDER BY id`;
  console.log('Districts:', JSON.stringify(districts, null, 2));
}

main().finally(() => prisma.$disconnect());