-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "district_id" INTEGER;

-- CreateIndex
CREATE INDEX "Product_district_id_idx" ON "Product"("district_id");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
