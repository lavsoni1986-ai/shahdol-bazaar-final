const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v106 = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Vendor" WHERE district_id = 106`;
  const v121 = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Vendor" WHERE district_id = 121`;
  console.log('Vendor - district_id=106:', v106[0].c, 'district_id=121:', v121[0].c);
  
  const p106 = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Product" WHERE district_id = 106`;
  const p121 = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Product" WHERE district_id = 121`;
  console.log('Product - district_id=106:', p106[0].c, 'district_id=121:', p121[0].c);
}

main().finally(() => prisma.$disconnect());