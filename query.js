import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.queryIntelligence.findMany({
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());