/*
  Warnings:

  - Added the required column `district_id` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Made the column `districtId` on table `UserEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_district_id_fkey";

-- AlterTable
ALTER TABLE "Inquiry" ALTER COLUMN "district_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "district_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserEvent" ALTER COLUMN "districtId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Review_district_id_idx" ON "Review"("district_id");

-- CreateIndex
CREATE INDEX "UserEvent_districtId_idx" ON "UserEvent"("districtId");

-- CreateIndex
CREATE INDEX "UserEvent_districtId_createdAt_idx" ON "UserEvent"("districtId", "createdAt");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
