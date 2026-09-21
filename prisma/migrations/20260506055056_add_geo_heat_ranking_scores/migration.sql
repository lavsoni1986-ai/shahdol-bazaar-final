-- AlterTable
ALTER TABLE "UserEvent" ADD COLUMN     "locality" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "callConversionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "emergencyReliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "navigationIntentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "repeatVisitScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "whatsappConversionScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DistrictHeatSignal" (
    "id" SERIAL NOT NULL,
    "districtId" INTEGER NOT NULL,
    "areaKey" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "directions" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "emergencyCount" INTEGER NOT NULL DEFAULT 0,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictHeatSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedDistrictLearning" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sourceDistrict" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedDistrictLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictHeatSignal_districtId_areaKey_domain_key" ON "DistrictHeatSignal"("districtId", "areaKey", "domain");

-- AddForeignKey
ALTER TABLE "DistrictHeatSignal" ADD CONSTRAINT "DistrictHeatSignal_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
