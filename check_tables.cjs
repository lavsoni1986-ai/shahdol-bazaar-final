const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());