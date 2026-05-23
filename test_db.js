import { PrismaClient } from '@prisma/client';

async function testDB() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');
    const result = await prisma.district.findMany();
    console.log(`Found ${result.length} districts`);
    if (result.length > 0) {
      console.log('First district:', result[0]);
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();