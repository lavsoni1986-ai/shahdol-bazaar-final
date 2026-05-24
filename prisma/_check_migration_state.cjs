const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const failed = await p.$queryRawUnsafe(
        `SELECT id, migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE LOWER(migration_name) LIKE '%audit%' ORDER BY started_at`
    );
    console.log('=== AUDIT MIGRATION STATE ===');
    failed.forEach(f => console.log(`  ${f.id.slice(0, 8)} | ${f.migration_name} | finished: ${f.finished_at} | rolled: ${f.rolled_back_at}`));

    // Check if hash + prevHash actually exist in DB
    const cols = await p.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name IN ('hash', 'prevHash', 'prev_hash') ORDER BY column_name`
    );
    console.log('\n=== HASH COLUMNS IN DB ===');
    console.table(cols);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
