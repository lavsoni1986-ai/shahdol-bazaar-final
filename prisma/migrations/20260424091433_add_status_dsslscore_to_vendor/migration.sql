-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "dsslScore" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT 'PENDING';
