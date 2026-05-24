-- SAFE ADDITION OF HASH / PREVHASH COLUMNS
-- Uses actual DB column names: entityType, createdAt (NOT entity_type, created_at)
--
-- Step 1: Drop if leftover from partial failed migration
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "hash";
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "prevHash";

-- Step 2: Add columns
-- hash gets temporary default to bypass NOT NULL constraint during ADD
ALTER TABLE "audit_log" ADD COLUMN "hash" TEXT NOT NULL DEFAULT 'placeholder';
ALTER TABLE "audit_log" ADD COLUMN "prevHash" TEXT;

-- Step 3: Backfill with deterministic MD5 using CORRECT column names
-- DB columns: id, action, entityType, entityId, createdAt (camelCase)
UPDATE "audit_log"
SET "hash" = md5(id::text || action || "entityType" || "entityId"::text || "createdAt"::text)
WHERE "hash" = 'placeholder';

-- Step 4: Set GENESIS prevHash for all existing rows
UPDATE "audit_log"
SET "prevHash" = 'GENESIS'
WHERE "prevHash" IS NULL;

-- Step 5: Remove the temporary default (app code sets hash explicitly)
ALTER TABLE "audit_log" ALTER COLUMN "hash" DROP DEFAULT;

-- Step 6: Create unique index for chain integrity
CREATE UNIQUE INDEX IF NOT EXISTS "audit_log_hash_key" ON "audit_log"("hash");
