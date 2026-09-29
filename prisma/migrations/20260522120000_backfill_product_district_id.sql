-- ============================================
-- SOVEREIGN BACKFILL: Product.districtId
-- ============================================
-- Phase P0 — Governance Constraint Hardening
-- 
-- Backfills Product.district_id from Vendor.district_id
-- for all products that have NULL district_id.
--
-- Two-phase strategy:
-- 1. Copy district_id from associated Vendor (canonical source)
-- 2. Any remaining orphans get default district (Shahdol district_id=1)
--
-- This is a ONE-TIME data fix. Future product creates
-- must use governance validation (validateProductCreation).

BEGIN;

-- Phase 1: Backfill from Vendor (canonical source of truth)
-- Product.districtId must match Vendor.districtId
UPDATE "Product" p
SET "district_id" = v."district_id"
FROM "Vendor" v
WHERE p."vendorId" = v.id
  AND p."district_id" IS NULL
  AND v."district_id" IS NOT NULL;

-- Phase 2: Orphan fallback — products whose vendor also has NULL district
-- Assign to default district (Shahdol)
UPDATE "Product" p
SET "district_id" = (
  SELECT id FROM "District" WHERE "isDefault" = true LIMIT 1
)
WHERE p."district_id" IS NULL;

-- Verify: should return 0 rows
SELECT COUNT(*) AS remaining_nulls FROM "Product" WHERE "district_id" IS NULL;

-- Verify: no product should have district_id != vendor district_id
SELECT p.id, p.title, p.district_id AS product_district, v.district_id AS vendor_district
FROM "Product" p
JOIN "Vendor" v ON v.id = p."vendorId"
WHERE p.district_id IS DISTINCT FROM v.district_id;

COMMIT;
