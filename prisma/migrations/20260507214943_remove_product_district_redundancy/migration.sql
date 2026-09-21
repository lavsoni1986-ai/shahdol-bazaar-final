/*
  Warnings:

  - The values [BANNED,SUSPENDED] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `district_id` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `config` on the `District` table. All the data in the column will be lost.
  - You are about to drop the column `themeConfig` on the `District` table. All the data in the column will be lost.
  - You are about to drop the column `aiRankScore` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `attributes` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `canonicalTitle` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `conversionScore` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `identityVersion` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isAiIndexed` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lastRankComputedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `legacyPriceRaw` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `legacyTitle` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `normalizedCategory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `orderCount` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `searchText` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `semanticKeywords` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `subCategory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `aiOrderCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `aiSearchCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `behaviorVersion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cashfree_customer_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cashfree_order_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `fraudScore` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveLocality` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastAiSearchAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tokenVersion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `totalSpent` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `trustScore` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `wallet` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `walletCredit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avgRating` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `avgResponseMinutes` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `boostExpiry` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `boostWeight` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `businessTags` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `callConversionScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledOrders` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `completedOrders` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `districtId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyReliabilityScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `fraudScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillmentScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `identityVersion` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isAiIndexed` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isSponsored` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `landmark` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `lastRankComputedAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `locality` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `metaData` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `navigationIntentScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `repeatCustomers` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `repeatVisitScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `serviceKeywords` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `subCategory` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `totalOrders` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `trustScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappConversionScore` on the `Vendor` table. All the data in the column will be lost.
  - The `category` column on the `Vendor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `businessType` column on the `Vendor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `safetyBadges` column on the `Vendor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `acceptedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `aiInfluenced` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `anomalyFlag` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `commission` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customerRating` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `districtSlug` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `fraudScore` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillmentMinutes` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `identityVersion` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `isRepeat` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `legacyShopId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `legacyVendorId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `locality` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderSource` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `packedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `productIdNormalized` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `repeatCustomerKey` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `searchQueryOrigin` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `sessionFingerprint` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shop_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `vendorIdNormalized` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `AIInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdSlot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminActionLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Advertisement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DSSLHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DistrictDemandMemory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DistrictEconomicCluster` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DistrictHeatSignal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DistrictSupplyGap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DsslConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FestiveEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FraudHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FraudPattern` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketTrend` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MerchantSubscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryIntelligence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SharedDistrictLearning` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SovereignEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemLock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserIntelligence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorFraudProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorMLProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorMetricsDaily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeightPerformance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[legacyHospitalId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[legacyShopId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[legacyServiceWorkerId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[district_id,slug]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VendorStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "Vendor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vendor" ALTER COLUMN "status" TYPE "VendorStatus_new" USING ("status"::text::"VendorStatus_new");
ALTER TYPE "VendorStatus" RENAME TO "VendorStatus_old";
ALTER TYPE "VendorStatus_new" RENAME TO "VendorStatus";
DROP TYPE "VendorStatus_old";
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "AIInsight" DROP CONSTRAINT "AIInsight_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "AdSlot" DROP CONSTRAINT "AdSlot_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_district_id_fkey";

-- DropForeignKey
ALTER TABLE "AdminActionLog" DROP CONSTRAINT "AdminActionLog_adminId_fkey";

-- DropForeignKey
ALTER TABLE "AdminLog" DROP CONSTRAINT "AdminLog_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "AnalyticsEvent" DROP CONSTRAINT "AnalyticsEvent_district_id_fkey";

-- DropForeignKey
ALTER TABLE "BusTimetable" DROP CONSTRAINT "BusTimetable_district_id_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_district_id_fkey";

-- DropForeignKey
ALTER TABLE "DSSLHistory" DROP CONSTRAINT "DSSLHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "DistrictDemandMemory" DROP CONSTRAINT "DistrictDemandMemory_districtId_fkey";

-- DropForeignKey
ALTER TABLE "DistrictEconomicCluster" DROP CONSTRAINT "DistrictEconomicCluster_districtId_fkey";

-- DropForeignKey
ALTER TABLE "DistrictHeatSignal" DROP CONSTRAINT "DistrictHeatSignal_districtId_fkey";

-- DropForeignKey
ALTER TABLE "DistrictSupplyGap" DROP CONSTRAINT "DistrictSupplyGap_districtId_fkey";

-- DropForeignKey
ALTER TABLE "DsslConfig" DROP CONSTRAINT "DsslConfig_districtId_fkey";

-- DropForeignKey
ALTER TABLE "EventLog" DROP CONSTRAINT "EventLog_districtId_fkey";

-- DropForeignKey
ALTER TABLE "FestiveEvent" DROP CONSTRAINT "FestiveEvent_districtId_fkey";

-- DropForeignKey
ALTER TABLE "FraudHistory" DROP CONSTRAINT "FraudHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "Hospital" DROP CONSTRAINT "Hospital_district_id_fkey";

-- DropForeignKey
ALTER TABLE "MarketTrend" DROP CONSTRAINT "MarketTrend_districtId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantSubscription" DROP CONSTRAINT "MerchantSubscription_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_district_id_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_district_id_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_district_id_fkey";

-- DropForeignKey
ALTER TABLE "Schools" DROP CONSTRAINT "Schools_district_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Shop" DROP CONSTRAINT "Shop_district_id_fkey";

-- DropForeignKey
ALTER TABLE "SystemLock" DROP CONSTRAINT "SystemLock_lockedBy_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_merchant_id_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_district_id_fkey";

-- DropForeignKey
ALTER TABLE "UserEvent" DROP CONSTRAINT "UserEvent_districtId_fkey";

-- DropForeignKey
ALTER TABLE "UserEvent" DROP CONSTRAINT "UserEvent_productId_fkey";

-- DropForeignKey
ALTER TABLE "UserEvent" DROP CONSTRAINT "UserEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserIntelligence" DROP CONSTRAINT "UserIntelligence_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_productId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_districtId_fkey";

-- DropForeignKey
ALTER TABLE "VendorFraudProfile" DROP CONSTRAINT "VendorFraudProfile_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorMLProfile" DROP CONSTRAINT "VendorMLProfile_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropIndex
DROP INDEX "Category_district_id_slug_key";

-- DropIndex
DROP INDEX "Product_district_id_idx";

-- DropIndex
DROP INDEX "Product_district_id_slug_key";

-- DropIndex
DROP INDEX "Product_slug_idx";

-- DropIndex
DROP INDEX "Review_district_id_idx";

-- DropIndex
DROP INDEX "Shop_district_id_idx";

-- DropIndex
DROP INDEX "Shop_district_id_slug_key";

-- DropIndex
DROP INDEX "Shop_id_district_id_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "Vendor_districtId_slug_key";

-- DropIndex
DROP INDEX "orders_district_id_idx";

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BusTimetable" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "district_id";

-- AlterTable
ALTER TABLE "District" DROP COLUMN "config",
DROP COLUMN "themeConfig",
ALTER COLUMN "state" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Hospital" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Offer" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "aiRankScore",
DROP COLUMN "attributes",
DROP COLUMN "canonicalTitle",
DROP COLUMN "conversionScore",
DROP COLUMN "district_id",
DROP COLUMN "embedding",
DROP COLUMN "identityVersion",
DROP COLUMN "isAiIndexed",
DROP COLUMN "lastRankComputedAt",
DROP COLUMN "legacyPriceRaw",
DROP COLUMN "legacyTitle",
DROP COLUMN "normalizedCategory",
DROP COLUMN "orderCount",
DROP COLUMN "searchText",
DROP COLUMN "semanticKeywords",
DROP COLUMN "slug",
DROP COLUMN "subCategory",
DROP COLUMN "tags",
DROP COLUMN "viewCount",
ADD COLUMN     "availableStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soldStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "district_id";

-- AlterTable
ALTER TABLE "Schools" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "district_id";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "aiOrderCount",
DROP COLUMN "aiSearchCount",
DROP COLUMN "behaviorVersion",
DROP COLUMN "cashfree_customer_id",
DROP COLUMN "cashfree_order_id",
DROP COLUMN "email",
DROP COLUMN "fraudScore",
DROP COLUMN "lastActiveLocality",
DROP COLUMN "lastAiSearchAt",
DROP COLUMN "tokenVersion",
DROP COLUMN "totalSpent",
DROP COLUMN "trustScore",
DROP COLUMN "wallet",
DROP COLUMN "walletCredit",
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "avgRating",
DROP COLUMN "avgResponseMinutes",
DROP COLUMN "boostExpiry",
DROP COLUMN "boostWeight",
DROP COLUMN "businessTags",
DROP COLUMN "callConversionScore",
DROP COLUMN "cancelledOrders",
DROP COLUMN "completedOrders",
DROP COLUMN "districtId",
DROP COLUMN "emergencyReliabilityScore",
DROP COLUMN "fraudScore",
DROP COLUMN "fulfillmentScore",
DROP COLUMN "identityVersion",
DROP COLUMN "isAiIndexed",
DROP COLUMN "isSponsored",
DROP COLUMN "landmark",
DROP COLUMN "lastRankComputedAt",
DROP COLUMN "locality",
DROP COLUMN "metaData",
DROP COLUMN "navigationIntentScore",
DROP COLUMN "repeatCustomers",
DROP COLUMN "repeatVisitScore",
DROP COLUMN "reviewCount",
DROP COLUMN "serviceKeywords",
DROP COLUMN "subCategory",
DROP COLUMN "totalOrders",
DROP COLUMN "trustScore",
DROP COLUMN "type",
DROP COLUMN "whatsappConversionScore",
ADD COLUMN     "aiAdCopy" TEXT,
ADD COLUMN     "aiDescription" TEXT,
ADD COLUMN     "boostedUntil" TIMESTAMP(3),
ADD COLUMN     "categorySlug" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "district_id" INTEGER,
ADD COLUMN     "dsslLastUpdated" TIMESTAMP(3),
ADD COLUMN     "experience" INTEGER DEFAULT 0,
ADD COLUMN     "hospitalData" JSONB,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "isProfessional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTrending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legacyHospitalId" TEXT,
ADD COLUMN     "legacyServiceWorkerId" INTEGER,
ADD COLUMN     "legacy_school_id" INTEGER,
ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceHours" TEXT,
ADD COLUMN     "trendingScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER,
ADD COLUMN     "vectorEmbedding" JSONB,
ADD COLUMN     "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT,
ALTER COLUMN "dsslScore" SET DEFAULT 0,
DROP COLUMN "businessType",
ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'PRODUCT',
DROP COLUMN "safetyBadges",
ADD COLUMN     "safetyBadges" TEXT[],
ALTER COLUMN "specialties" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "acceptedAt",
DROP COLUMN "aiInfluenced",
DROP COLUMN "anomalyFlag",
DROP COLUMN "cancelledAt",
DROP COLUMN "commission",
DROP COLUMN "customerRating",
DROP COLUMN "deliveredAt",
DROP COLUMN "districtSlug",
DROP COLUMN "fraudScore",
DROP COLUMN "fulfillmentMinutes",
DROP COLUMN "identityVersion",
DROP COLUMN "isRepeat",
DROP COLUMN "legacyShopId",
DROP COLUMN "legacyVendorId",
DROP COLUMN "locality",
DROP COLUMN "notes",
DROP COLUMN "orderSource",
DROP COLUMN "packedAt",
DROP COLUMN "productIdNormalized",
DROP COLUMN "repeatCustomerKey",
DROP COLUMN "searchQueryOrigin",
DROP COLUMN "sessionFingerprint",
DROP COLUMN "shop_id",
DROP COLUMN "vendorIdNormalized",
ALTER COLUMN "district_id" DROP NOT NULL;

-- DropTable
DROP TABLE "AIInsight";

-- DropTable
DROP TABLE "AdSlot";

-- DropTable
DROP TABLE "AdminActionLog";

-- DropTable
DROP TABLE "AdminLog";

-- DropTable
DROP TABLE "Advertisement";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "DSSLHistory";

-- DropTable
DROP TABLE "DistrictDemandMemory";

-- DropTable
DROP TABLE "DistrictEconomicCluster";

-- DropTable
DROP TABLE "DistrictHeatSignal";

-- DropTable
DROP TABLE "DistrictSupplyGap";

-- DropTable
DROP TABLE "DsslConfig";

-- DropTable
DROP TABLE "EventLog";

-- DropTable
DROP TABLE "FestiveEvent";

-- DropTable
DROP TABLE "FraudHistory";

-- DropTable
DROP TABLE "FraudPattern";

-- DropTable
DROP TABLE "MarketTrend";

-- DropTable
DROP TABLE "MerchantSubscription";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "QueryIntelligence";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "SharedDistrictLearning";

-- DropTable
DROP TABLE "SovereignEvent";

-- DropTable
DROP TABLE "SystemConfig";

-- DropTable
DROP TABLE "SystemLock";

-- DropTable
DROP TABLE "Transaction";

-- DropTable
DROP TABLE "UserEvent";

-- DropTable
DROP TABLE "UserIntelligence";

-- DropTable
DROP TABLE "UserPreference";

-- DropTable
DROP TABLE "VendorFraudProfile";

-- DropTable
DROP TABLE "VendorInsight";

-- DropTable
DROP TABLE "VendorMLProfile";

-- DropTable
DROP TABLE "VendorMetricsDaily";

-- DropTable
DROP TABLE "WeightPerformance";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "PlanTier";

-- DropEnum
DROP TYPE "VendorCategory";

-- CreateTable
CREATE TABLE "sovereign_orders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "districtId" INTEGER NOT NULL,
    "totalAmountPaisa" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sovereign_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sovereign_order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaisa" INTEGER NOT NULL,
    "totalPricePaisa" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sovereign_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sovereign_orders_idempotencyKey_key" ON "sovereign_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sovereign_orders_userId_idx" ON "sovereign_orders"("userId");

-- CreateIndex
CREATE INDEX "sovereign_orders_districtId_idx" ON "sovereign_orders"("districtId");

-- CreateIndex
CREATE INDEX "sovereign_orders_status_idx" ON "sovereign_orders"("status");

-- CreateIndex
CREATE INDEX "sovereign_orders_idempotencyKey_idx" ON "sovereign_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sovereign_order_items_orderId_idx" ON "sovereign_order_items"("orderId");

-- CreateIndex
CREATE INDEX "sovereign_order_items_productId_idx" ON "sovereign_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Schools_district_id_idx" ON "Schools"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_legacyHospitalId_key" ON "Vendor"("legacyHospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_legacyShopId_key" ON "Vendor"("legacyShopId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_legacyServiceWorkerId_key" ON "Vendor"("legacyServiceWorkerId");

-- CreateIndex
CREATE INDEX "Vendor_slug_idx" ON "Vendor"("slug");

-- CreateIndex
CREATE INDEX "Vendor_businessType_idx" ON "Vendor"("businessType");

-- CreateIndex
CREATE INDEX "Vendor_district_id_idx" ON "Vendor"("district_id");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_isTrending_idx" ON "Vendor"("isTrending");

-- CreateIndex
CREATE INDEX "Vendor_trendingScore_idx" ON "Vendor"("trendingScore");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_district_id_slug_key" ON "Vendor"("district_id", "slug");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schools" ADD CONSTRAINT "Schools_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTimetable" ADD CONSTRAINT "BusTimetable_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sovereign_orders" ADD CONSTRAINT "sovereign_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sovereign_orders" ADD CONSTRAINT "sovereign_orders_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sovereign_order_items" ADD CONSTRAINT "sovereign_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "sovereign_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sovereign_order_items" ADD CONSTRAINT "sovereign_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
