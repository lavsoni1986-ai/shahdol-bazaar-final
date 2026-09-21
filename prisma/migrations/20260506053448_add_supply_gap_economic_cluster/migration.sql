-- CreateTable
CREATE TABLE "DistrictSupplyGap" (
    "id" SERIAL NOT NULL,
    "districtId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "demandCount" INTEGER NOT NULL DEFAULT 1,
    "urgencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onboardingReady" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DistrictSupplyGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictEconomicCluster" (
    "id" SERIAL NOT NULL,
    "districtId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "totalSearches" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "growthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DistrictEconomicCluster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictSupplyGap_districtId_domain_entity_key" ON "DistrictSupplyGap"("districtId", "domain", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictEconomicCluster_districtId_domain_key" ON "DistrictEconomicCluster"("districtId", "domain");

-- AddForeignKey
ALTER TABLE "DistrictSupplyGap" ADD CONSTRAINT "DistrictSupplyGap_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictEconomicCluster" ADD CONSTRAINT "DistrictEconomicCluster_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
