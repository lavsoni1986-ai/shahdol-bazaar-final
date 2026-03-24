import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  try {
    // Check Doctor columns
    const columns = await p.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Doctor'
      ORDER BY ordinal_position
    `;
    console.log('Doctor columns:', JSON.stringify(columns, null, 2));
    
    // Add isVerified to Hospital
    await p.$queryRaw`ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`;
    console.log('Added isVerified to Hospital');
    
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
