/**
 * ============================================
 * Row Level Security (RLS) Migration
 * ============================================
 * This script sets up PostgreSQL Row Level Security policies
 * for multi-tenant isolation in the Shahdol Bazaar platform.
 * 
 * IMPORTANT: Run this migration after the schema is applied:
 * npx prisma migrate deploy --preview-feature
 * 
 * Then execute this SQL script:
 * psql $DATABASE_URL -f prisma/rls-policies.sql
 * 
 * Or use the Prisma raw query execution:
 * npx tsx prisma/rls-policies.ts
 */

-- ============================================
-- ENABLE RLS ON TABLES
-- ============================================

-- Enable RLS on Vendor table
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Inquiry table
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on AnalyticsEvent table
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on BusTimetable table
ALTER TABLE "BusTimetable" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DISTRICT ISOLATION POLICIES
-- ============================================

-- Drop existing policies if they exist (for migrations)
DROP POLICY IF EXISTS "vendor_district_isolation" ON "Vendor";
DROP POLICY IF EXISTS "inquiry_district_isolation" ON "Inquiry";
DROP POLICY IF EXISTS "analytics_district_isolation" ON "AnalyticsEvent";
DROP POLICY IF EXISTS "bus_district_isolation" ON "BusTimetable";

-- STRICT: Create district isolation policy for Vendor
-- Users can ONLY see vendors in their district - NO FALLBACK to null
-- If district context is not set, queries will return EMPTY results (not all data)
-- This prevents data leakage across tenants
CREATE POLICY "vendor_district_isolation" ON "Vendor"
FOR ALL
USING (
  -- Only allow access if districtId matches current session context
  -- and districtId is NOT NULL (prevents accidental full-table access)
  "districtId" = (current_setting('app.current_district_id', true)::int)
  AND "districtId" IS NOT NULL
);

-- Create district isolation policy for Inquiry
-- Users can only see inquiries in their district - STRICT
CREATE POLICY "inquiry_district_isolation" ON "Inquiry"
FOR ALL
USING (
  "districtId" = (current_setting('app.current_district_id', true)::int)
  AND "districtId" IS NOT NULL
);

-- Create district isolation policy for AnalyticsEvent
-- Users can only see analytics for their district - STRICT
CREATE POLICY "analytics_district_isolation" ON "AnalyticsEvent"
FOR ALL
USING (
  "districtId" = (current_setting('app.current_district_id', true)::int)
  AND "districtId" IS NOT NULL
);

-- Create district isolation policy for BusTimetable
-- Users can only see bus routes for their district - STRICT
CREATE POLICY "bus_district_isolation" ON "BusTimetable"
FOR ALL
USING (
  "districtId" = (current_setting('app.current_district_id', true)::int)
  AND "districtId" IS NOT NULL
);

-- ============================================
-- SUPER ADMIN BYPASS (Optional)
-- ============================================
-- Create a function to check if user is super admin
-- Super admins can see all data across districts

-- Note: For Prisma, we handle this in application code
-- by checking the role before setting the session variable.

-- ============================================
-- FUNCTION TO SET DISTRICT CONTEXT
-- ============================================

-- Function to set the current district context for RLS
-- IMPORTANT: This must be called before any tenant-specific queries!
-- In STRICT mode: if district is not set, queries return EMPTY (no data leakage)
CREATE OR REPLACE FUNCTION set_district_context(p_district_id INT)
RETURNS VOID AS $
BEGIN
  -- Validate district exists before setting
  IF p_district_id IS NOT NULL THEN
    PERFORM id FROM "District" WHERE id = p_district_id AND "isActive" = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive district ID: %', p_district_id;
    END IF;
  END IF;
  PERFORM set_config('app.current_district_id', p_district_id::text, true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

-- Check RLS status on all tenant tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('Vendor', 'Inquiry', 'AnalyticsEvent', 'BusTimetable')
ORDER BY tablename;

-- ============================================
-- RLS POLICY DESCRIPTIONS
-- ============================================

COMMENT ON POLICY "vendor_district_isolation" ON "Vendor" IS 
'STRICT: Ensures users can ONLY access vendors within their assigned district. No fallback to NULL. Queries return EMPTY if district context is not set. Use set_district_context() to set context before queries.';

COMMENT ON POLICY "inquiry_district_isolation" ON "Inquiry" IS 
'STRICT: Ensures users can ONLY access inquiries within their assigned district. No fallback to NULL. Use set_district_context() to set context before queries.';

COMMENT ON POLICY "analytics_district_isolation" ON "AnalyticsEvent" IS 
'STRICT: Ensures users can ONLY access analytics data for their assigned district. No fallback to NULL. Use set_district_context() to set context before queries.';

COMMENT ON POLICY "bus_district_isolation" ON "BusTimetable" IS 
'STRICT: Ensures users can ONLY access bus routes for their assigned district. No fallback to NULL. Use set_district_context() to set context before queries.';

-- ============================================
-- NEXT STEPS FOR DEVELOPERS (STRICT MODE)
-- ============================================
/**
 * To use RLS in STRICT mode (recommended for production):
 * 
 * 1. After authenticating the user, get their districtId from the database
 * 2. BEFORE querying tenant tables, validate and set the session variable:
 * 
 *    // Validate district exists and is active
 *    const district = await prisma.district.findFirst({
 *      where: { id: user.districtId, isActive: true }
 *    });
 *    if (!district) {
 *      // Reject request - invalid district
 *      return res.status(400).json({ message: 'Invalid district' });
 *    }
 *    
 *    // Set context for RLS
 *    await prisma.$executeRaw`
 *      SELECT set_district_context(${user.districtId})
 *    `;
 * 
 * 3. All subsequent queries will be automatically filtered by the RLS policy
 * 
 * 4. IMPORTANT: Do NOT set districtId to NULL - this will result in EMPTY results
 *    (strict mode prevents accidental data leakage)
 * 
 * 5. For SUPER_ADMIN users who need access to ALL districts:
 *    - Option A: Bypass RLS by using admin API endpoints that use prisma.$executeRaw
 *    - Option B: Query with districtId = ANY(array of all active district IDs)
 */
