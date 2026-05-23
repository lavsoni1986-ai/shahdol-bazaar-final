const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const districts = await prisma.district.findMany();
  console.log('All districts:', JSON.stringify(districts, null, 2));
}

main().finally(() => prisma.$disconnect());