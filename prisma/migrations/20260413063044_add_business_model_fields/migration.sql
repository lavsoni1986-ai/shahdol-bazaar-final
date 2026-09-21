-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "commission" DOUBLE PRECISION NOT NULL DEFAULT 0;
