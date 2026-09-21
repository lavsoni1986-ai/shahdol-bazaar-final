-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "aiRankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "canonicalTitle" TEXT,
ADD COLUMN     "conversionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "identityVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "isAiIndexed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRankComputedAt" TIMESTAMP(3),
ADD COLUMN     "legacyPriceRaw" TEXT,
ADD COLUMN     "legacyTitle" TEXT,
ADD COLUMN     "normalizedCategory" TEXT,
ADD COLUMN     "orderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "semanticKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiOrderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiSearchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "behaviorVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastActiveLocality" TEXT,
ADD COLUMN     "lastAiSearchAt" TIMESTAMP(3),
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserEvent" ADD COLUMN     "aiResponseSummary" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "converted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "districtId" INTEGER,
ADD COLUMN     "matchedProductIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "matchedVendorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "parsedCategory" TEXT,
ADD COLUMN     "parsedIntent" TEXT,
ADD COLUMN     "queryText" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "aiRankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "avgResponseMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "businessTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fulfillmentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "identityVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "isAiIndexed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "lastRankComputedAt" TIMESTAMP(3),
ADD COLUMN     "legacyShopId" INTEGER,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "repeatCustomers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "serviceKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "aiInfluenced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anomalyFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customerRating" DOUBLE PRECISION,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "districtSlug" TEXT,
ADD COLUMN     "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fulfillmentMinutes" INTEGER,
ADD COLUMN     "identityVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "legacyShopId" INTEGER,
ADD COLUMN     "legacyVendorId" INTEGER,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "orderSource" TEXT,
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "productIdNormalized" INTEGER,
ADD COLUMN     "repeatCustomerKey" TEXT,
ADD COLUMN     "searchQueryOrigin" TEXT,
ADD COLUMN     "sessionFingerprint" TEXT,
ADD COLUMN     "vendorIdNormalized" INTEGER;

-- CreateTable
CREATE TABLE "VendorMetricsDaily" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiMentions" INTEGER NOT NULL DEFAULT 0,
    "trustDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "VendorMetricsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorMetricsDaily_vendorId_idx" ON "VendorMetricsDaily"("vendorId");

-- CreateIndex
CREATE INDEX "VendorMetricsDaily_date_idx" ON "VendorMetricsDaily"("date");
