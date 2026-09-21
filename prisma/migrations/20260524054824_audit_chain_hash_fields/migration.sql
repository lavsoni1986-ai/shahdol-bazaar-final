/*
  Warnings:
  - Added the required column `hash` to the `audit_log` table.
  - Existing rows get a placeholder hash that gets replaced by a deterministic backfill.
  - prevHash will be NULL for existing rows (chain integrity starts fresh).
  - A unique constraint on hash will be created.
*/

-- Step 1: Add columns with temporary default to pass NOT NULL
ALTER TABLE "audit_log" ADD COLUMN "hash" TEXT NOT NULL DEFAULT 'placeholder';
ALTER TABLE "audit_log" ADD COLUMN "prevHash" TEXT;

-- Step 2: Replace placeholder with deterministic MD5 hash
-- NOTE: DB uses camelCase columns (entityType, entityId, createdAt)
UPDATE "audit_log" SET "hash" = md5(id::text || action || "entityType" || "entityId"::text || "createdAt"::text) WHERE "hash" = 'placeholder';

-- Step 3: Set GENESIS prevHash for all existing rows
UPDATE "audit_log" SET "prevHash" = 'GENESIS' WHERE "prevHash" IS NULL;

-- Step 4: Drop the default since app code sets hash explicitly
ALTER TABLE "audit_log" ALTER COLUMN "hash" DROP DEFAULT;

-- Step 5: Create unique index on hash
CREATE UNIQUE INDEX IF NOT EXISTS "audit_log_hash_key" ON "audit_log"("hash");
