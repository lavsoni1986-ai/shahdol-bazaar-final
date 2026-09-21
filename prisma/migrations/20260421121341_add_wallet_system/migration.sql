/*
  Warnings:

  - You are about to drop the column `merchantId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_merchantId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "merchantId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "merchant_id" INTEGER,
ADD COLUMN     "method" TEXT DEFAULT 'SYSTEM',
ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "wallet" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "walletCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Transaction_user_id_createdAt_idx" ON "Transaction"("user_id", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_user_id_type_idx" ON "Transaction"("user_id", "type");

-- CreateIndex
CREATE INDEX "orders_district_id_idx" ON "orders"("district_id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
