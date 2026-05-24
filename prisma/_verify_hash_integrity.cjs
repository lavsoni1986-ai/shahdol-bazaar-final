const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Check total rows with hash
    const totalRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "audit_log"`);
    const nullHashRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "audit_log" WHERE "hash" IS NULL`);
    const nullPrevHash = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "audit_log" WHERE "prevHash" IS NULL`);
    const placeholders = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "audit_log" WHERE "hash" = 'placeholder'`);
    const duplicateHashes = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count FROM (
            SELECT "hash" FROM "audit_log" GROUP BY "hash" HAVING COUNT(*) > 1
        ) dup
    `);
    const uniqueConstraint = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count FROM information_schema.table_constraints 
        WHERE table_name = 'audit_log' AND constraint_type = 'UNIQUE'
    `);

    console.log('\n=== AUDIT LOG INTEGRITY VERIFICATION ===');
    console.log(`  Total rows:           ${totalRows[0].count}`);
    console.log(`  Null hashes:          ${nullHashRows[0].count}`);
    console.log(`  Null prevHash:        ${nullPrevHash[0].count}`);
    console.log(`  Placeholder values:   ${placeholders[0].count}`);
    console.log(`  Duplicate hashes:     ${duplicateHashes[0].count}`);
    console.log(`  Unique constraints:   ${uniqueConstraint[0].count}`);

    // Show sample
    const sample = await prisma.$queryRawUnsafe(`
        SELECT id, action, "entityType", "entityId", substring("hash", 1, 16) as hash_prefix, substring("prevHash", 1, 16) as prevhash_prefix
        FROM "audit_log" ORDER BY id LIMIT 5
    `);
    console.log('\n=== SAMPLE ROWS ===');
    console.table(sample);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
