/*
  Warnings:

  - You are about to drop the column `vendorId` on the `DSSLHistory` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `aiAdCopy` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `aiDescription` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `boostedUntil` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `businessType` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `categorySlug` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `completedOrders` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `conversionRate` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `disputes` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `district_id` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `dsslLastUpdated` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `dsslScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `fraudScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalData` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isHospital` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isProfessional` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isShadowBanned` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `isTrending` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `legacyHospitalId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `legacyShopId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_school_id` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `orderSuccessRate` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `recentActivityScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `repeatCustomers` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `responseTimeMs` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `responseTimeScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `safetyBadges` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `serviceArea` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `serviceHours` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `specialties` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `totalOrders` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `totalReviews` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `trendingScore` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `trustUpdatedAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `vectorEmbedding` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappNotifications` on the `Vendor` table. All the data in the column will be lost.
  - You are about to alter the column `trustScore` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[district_id,slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[districtId,slug]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Made the column `trustScore` on table `Vendor` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('HOSPITAL', 'PHARMACY', 'GROCERY', 'SERVICE', 'EDUCATION', 'TRANSPORT');

-- DropForeignKey
ALTER TABLE "DSSLHistory" DROP CONSTRAINT "DSSLHistory_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Doctor" DROP CONSTRAINT "Doctor_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "FraudHistory" DROP CONSTRAINT "FraudHistory_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "UserEvent" DROP CONSTRAINT "UserEvent_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_district_id_fkey";

-- DropForeignKey
ALTER TABLE "VendorInsight" DROP CONSTRAINT "VendorInsight_vendorId_fkey";

-- DropIndex
DROP INDEX "DSSLHistory_vendorId_idx";

-- DropIndex
DROP INDEX "Vendor_businessType_idx";

-- DropIndex
DROP INDEX "Vendor_district_id_idx";

-- DropIndex
DROP INDEX "Vendor_district_id_isShadowBanned_dsslScore_idx";

-- DropIndex
DROP INDEX "Vendor_district_id_slug_key";

-- DropIndex
DROP INDEX "Vendor_isTrending_idx";

-- DropIndex
DROP INDEX "Vendor_legacyHospitalId_key";

-- DropIndex
DROP INDEX "Vendor_legacyShopId_key";

-- DropIndex
DROP INDEX "Vendor_slug_idx";

-- DropIndex
DROP INDEX "Vendor_status_idx";

-- DropIndex
DROP INDEX "Vendor_trendingScore_idx";

-- AlterTable
ALTER TABLE "DSSLHistory" DROP COLUMN "vendorId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "address",
DROP COLUMN "aiAdCopy",
DROP COLUMN "aiDescription",
DROP COLUMN "boostedUntil",
DROP COLUMN "businessType",
DROP COLUMN "categorySlug",
DROP COLUMN "category_id",
DROP COLUMN "completedOrders",
DROP COLUMN "conversionRate",
DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "disputes",
DROP COLUMN "district_id",
DROP COLUMN "dsslLastUpdated",
DROP COLUMN "dsslScore",
DROP COLUMN "experience",
DROP COLUMN "fraudScore",
DROP COLUMN "hospitalData",
DROP COLUMN "images",
DROP COLUMN "isFeatured",
DROP COLUMN "isHospital",
DROP COLUMN "isProfessional",
DROP COLUMN "isShadowBanned",
DROP COLUMN "isTrending",
DROP COLUMN "legacyHospitalId",
DROP COLUMN "legacyShopId",
DROP COLUMN "legacy_school_id",
DROP COLUMN "logo",
DROP COLUMN "mobile",
DROP COLUMN "orderSuccessRate",
DROP COLUMN "phone",
DROP COLUMN "rating",
DROP COLUMN "recentActivityScore",
DROP COLUMN "repeatCustomers",
DROP COLUMN "responseTimeMs",
DROP COLUMN "responseTimeScore",
DROP COLUMN "safetyBadges",
DROP COLUMN "serviceArea",
DROP COLUMN "serviceHours",
DROP COLUMN "specialties",
DROP COLUMN "status",
DROP COLUMN "totalOrders",
DROP COLUMN "totalReviews",
DROP COLUMN "trendingScore",
DROP COLUMN "trustUpdatedAt",
DROP COLUMN "updatedAt",
DROP COLUMN "user_id",
DROP COLUMN "vectorEmbedding",
DROP COLUMN "whatsappNotifications",
ADD COLUMN     "category" "VendorCategory" NOT NULL,
ADD COLUMN     "districtId" INTEGER NOT NULL,
ADD COLUMN     "metaData" JSONB,
ALTER COLUMN "trustScore" SET NOT NULL,
ALTER COLUMN "trustScore" SET DEFAULT 0,
ALTER COLUMN "trustScore" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_district_id_slug_key" ON "Product"("district_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_districtId_slug_key" ON "Vendor"("districtId", "slug");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
