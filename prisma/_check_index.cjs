const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const indexes = await prisma.$queryRawUnsafe(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'audit_log'
    `);
    console.log('=== audit_log INDEXES ===');
    indexes.forEach(i => console.log(`  ${i.indexname}: ${i.indexdef}`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
