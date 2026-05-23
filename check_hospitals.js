import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runQuery() {
  try {
    const result = await prisma.$queryRaw`
      SELECT id, name, "businessType", status, "isVerified"
      FROM "Vendor"
      WHERE "businessType" = 'HEALTHCARE'
      AND district_id = 1
      AND status = 'APPROVED'
      LIMIT 5;
    `;
    console.log('Query results:');
    console.log(result);
  } catch (error) {
    console.error('Error running query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runQuery();