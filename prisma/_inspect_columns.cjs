const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Query information_schema for audit_log columns
    const result = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'audit_log' 
    ORDER BY ordinal_position
  `);
    console.log('=== audit_log COLUMNS IN DATABASE ===');
    console.table(result);

    // Also check if hash and prevHash columns exist
    const hashCheck = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'audit_log' AND column_name IN ('hash', 'prev_hash', 'prevHash', 'created_at', 'createdAt')
  `);
    console.log('\n=== KEY COLUMN CHECK ===');
    console.table(hashCheck);

    // Check migration status
    const migrationCheck = await prisma.$queryRawUnsafe(`
    SELECT * FROM _prisma_migrations WHERE LOWER(migration_name) LIKE '%audit%' ORDER BY finished_at DESC
  `);
    console.log('\n=== AUDIT-RELATED MIGRATIONS ===');
    console.table(migrationCheck);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
