-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isHospital" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isShadowBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "safetyBadges" JSONB,
ADD COLUMN     "type" TEXT;
