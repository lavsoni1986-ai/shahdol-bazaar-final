-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_address_snapshot" JSONB;

-- AlterTable
ALTER TABLE "sovereign_orders" ADD COLUMN "delivery_address_snapshot" JSONB;

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "district_id" INTEGER NOT NULL,
    "street_address" TEXT NOT NULL,
    "house_number" TEXT,
    "landmark" TEXT,
    "village" TEXT,
    "ward" TEXT,
    "city" TEXT,
    "district_name" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DELIVERY',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "addresses_user_id_id_key" ON "addresses"("user_id", "id");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "addresses_district_id_idx" ON "addresses"("district_id");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
