-- 🛡️ BHARAT-OS: SOVEREIGN PRODUCT DISTRICT ALIGNMENT MIGRATION
-- Adds districtId to Product model for direct sovereign district isolation.
-- Safe, non-destructive migration preserving all existing data.

-- Step 1: Add nullable districtId column to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "district_id" INTEGER;

-- Step 2: Create index on district_id for query performance
CREATE INDEX IF NOT EXISTS "Product_district_id_idx" ON "Product" ("district_id");

-- Step 3: Backfill districtId from Vendor.districtId
-- This ensures all existing products inherit their vendor's district.
UPDATE "Product" p
SET "district_id" = v."district_id"
FROM "Vendor" v
WHERE p."vendorId" = v.id
  AND p."district_id" IS NULL;

-- Step 4: Set districtId to a default district for any orphan products
-- (products whose vendor has no districtId)
UPDATE "Product" p
SET "district_id" = (
    SELECT id FROM "District" WHERE "isDefault" = true LIMIT 1
)
WHERE p."district_id" IS NULL;

-- Step 5: Validate no products remain with NULL districtId
-- (This is informational; the column remains nullable)
SELECT COUNT(*) as "orphan_products" FROM "Product" WHERE "district_id" IS NULL;

-- Step 6: Verify backfill completeness
SELECT 
    COUNT(*) as "total_products",
    COUNT(p."district_id") as "with_district",
    COUNT(*) - COUNT(p."district_id") as "still_null",
    COUNT(DISTINCT p."district_id") as "distinct_districts"
FROM "Product" p;
