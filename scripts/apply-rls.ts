/**
 * ============================================
 * RLS Policy Application Script
 * ============================================
 * This script applies Row Level Security policies to the database
 * executing SQL statements ONE BY ONE to avoid Prisma's 42601 error
 * (cannot insert multiple commands into a prepared statement).
 * 
 * Run: npx tsx scripts/apply-rls.ts
 * 
 * IMPORTANT: Run this after database migration is complete
 */

import { prisma } from '../server/storage.js';

// All RLS SQL statements - one per line, will be executed individually
const RLS_STATEMENTS = [
  // Enable RLS on tables
  `ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "BusTimetable" ENABLE ROW LEVEL SECURITY`,
  
  // Drop existing policies (ignore errors if they don't exist)
  `DROP POLICY IF EXISTS "vendor_district_isolation" ON "Vendor"`,
  `DROP POLICY IF EXISTS "inquiry_district_isolation" ON "Inquiry"`,
  `DROP POLICY IF EXISTS "analytics_district_isolation" ON "AnalyticsEvent"`,
  `DROP POLICY IF EXISTS "bus_district_isolation" ON "BusTimetable"`,
  
  // Create STRICT district isolation policies
  `CREATE POLICY "vendor_district_isolation" ON "Vendor" FOR ALL USING ("districtId" = (current_setting('app.current_district_id', true)::int) AND "districtId" IS NOT NULL)`,
  `CREATE POLICY "inquiry_district_isolation" ON "Inquiry" FOR ALL USING ("districtId" = (current_setting('app.current_district_id', true)::int) AND "districtId" IS NOT NULL)`,
  `CREATE POLICY "analytics_district_isolation" ON "AnalyticsEvent" FOR ALL USING ("districtId" = (current_setting('app.current_district_id', true)::int) AND "districtId" IS NOT NULL)`,
  `CREATE POLICY "bus_district_isolation" ON "BusTimetable" FOR ALL USING ("districtId" = (current_setting('app.current_district_id', true)::int) AND "districtId" IS NOT NULL)`,
  
  // Create set_district_context function
  `CREATE OR REPLACE FUNCTION set_district_context(p_district_id INT) RETURNS VOID AS $$ BEGIN IF p_district_id IS NOT NULL THEN PERFORM id FROM "District" WHERE id = p_district_id AND "isActive" = true; IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or inactive district ID: %', p_district_id; END IF; END IF; PERFORM set_config('app.current_district_id', p_district_id::text, true); END; $$ LANGUAGE plpgsql SECURITY DEFINER`,
];

async function executeSQL(sql: string, index: number, total: number): Promise<boolean> {
  const cleanSQL = sql.trim();
  if (!cleanSQL) return true;
  
  try {
    console.log(`  Executing [${index + 1}/${total}]: ${cleanSQL.substring(0, 60)}...`);
    await prisma.$executeRawUnsafe(cleanSQL);
    return true;
  } catch (error: any) {
    // Log error but continue - some policies might already exist
    if (error.message.includes('already exists') || error.message.includes('does not exist')) {
      console.log(`    ⚠️  ${error.message.includes('already exists') ? 'Policy already exists' : 'Table/policy not found'} - continuing...`);
      return true;
    }
    console.error(`    ❌ Error: ${error.message}`);
    return false;
  }
}

async function applyRLS() {
  console.log('🔵 [RLS] Starting Row Level Security policy application...\n');
  console.log(`📊 Total statements to execute: ${RLS_STATEMENTS.length}\n`);

  let successCount = 0;
  let failCount = 0;

  // Execute each statement individually
  for (let i = 0; i < RLS_STATEMENTS.length; i++) {
    const success = await executeSQL(RLS_STATEMENTS[i], i, RLS_STATEMENTS.length);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (failCount > 0) {
    console.log(`⚠️  Completed with ${failCount} error(s)`);
    console.log(`✅ Successfully executed: ${successCount}/${RLS_STATEMENTS.length}`);
  } else {
    console.log('✅ All RLS policies processed successfully!');
  }
  
  console.log('='.repeat(50) + '\n');

  try {
    // Verify policies were created
    const policies = await prisma.$queryRaw<{ policyname: string; tablename: string }[]>`
      SELECT policyname, tablename FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('📋 Created Policies:');
    for (const policy of policies) {
      console.log(`  - ${policy.tablename}.${policy.policyname}`);
    }

    // Verify RLS is enabled on tables
    const tables = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('Vendor', 'Inquiry', 'AnalyticsEvent', 'BusTimetable')
      ORDER BY tablename
    `;

    console.log('\n🔒 RLS Status After:');
    for (const table of tables) {
      console.log(`  - ${table.tablename}: ${table.rowsecurity ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    }

    console.log('\n🎉 RLS Application Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Set district context before querying tenant tables:');
    console.log('      await prisma.$executeRaw`SELECT set_district_context(${districtId})`');
    console.log('   2. For SUPER_ADMIN, use admin endpoints that bypass RLS\n');

  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
applyRLS();
