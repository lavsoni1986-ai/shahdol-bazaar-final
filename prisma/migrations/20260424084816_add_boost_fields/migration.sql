-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "boostExpiry" TIMESTAMP(3),
ADD COLUMN     "boostWeight" INTEGER DEFAULT 20;
