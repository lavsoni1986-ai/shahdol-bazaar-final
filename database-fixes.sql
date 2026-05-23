/**
 * 🔧 DATABASE FIXES FOR DISTRICT DATA ISOLATION
 * Run these SQL commands in your database to fix the multi-tenant data issues
 */

-- ✅ FIX 1: Set districtId = 121 for all vendors that don't have it
UPDATE "Vendor"
SET "districtId" = 121
WHERE "districtId" IS NULL;

-- ✅ FIX 2: Link products to vendors with correct district
UPDATE "Product"
SET "vendorId" = (
  SELECT id FROM "Vendor"
  WHERE "districtId" = 121
  LIMIT 1
)
WHERE "vendorId" IS NULL;

-- ✅ OPTIONAL FIX 3: Clean duplicate vendors (only if needed)
-- DELETE FROM "Vendor"
-- WHERE "id" NOT IN (
--   SELECT MIN(id)
--   FROM "Vendor"
--   GROUP BY slug
-- );

-- ✅ VERIFICATION QUERIES
-- Check total vendors
SELECT COUNT(*) as total_vendors FROM "Vendor";

-- Check Shahdol vendors
SELECT COUNT(*) as shahdol_vendors FROM "Vendor" WHERE "districtId" = 121;

-- Check products with vendors
SELECT COUNT(*) as products_with_vendors FROM "Product" WHERE "vendorId" IS NOT NULL;