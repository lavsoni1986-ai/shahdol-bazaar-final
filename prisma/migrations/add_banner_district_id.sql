-- P0-B: Add district_id column to Banner table
-- This migration adds tenant isolation support for banners.
-- Execute with: psql -f prisma/migrations/add_banner_district_id.sql

ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS district_id INTEGER;

-- Add foreign key constraint to District table
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_district_id_fkey"
  FOREIGN KEY (district_id) REFERENCES "District"(id)
  ON DELETE SET NULL;

-- Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS "Banner_district_id_idx" ON "Banner"(district_id);

-- Assign existing banners to the default district (id=1) for backward compatibility
UPDATE "Banner" SET district_id = 1 WHERE district_id IS NULL;

-- After ensuring backward compatible data, make district_id NOT NULL
-- Uncomment after verifying all banners have district_id:
-- ALTER TABLE "Banner" ALTER COLUMN district_id SET NOT NULL;
