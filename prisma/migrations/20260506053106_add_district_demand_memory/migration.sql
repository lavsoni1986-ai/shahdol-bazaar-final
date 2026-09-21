-- CreateTable
CREATE TABLE "DistrictDemandMemory" (
    "id" SERIAL NOT NULL,
    "districtId" INTEGER NOT NULL,
    "domain" TEXT,
    "entity" TEXT,
    "query" TEXT NOT NULL,
    "demandCount" INTEGER NOT NULL DEFAULT 1,
    "lastQueried" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistrictDemandMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDemandMemory_districtId_domain_entity_key" ON "DistrictDemandMemory"("districtId", "domain", "entity");

-- AddForeignKey
ALTER TABLE "DistrictDemandMemory" ADD CONSTRAINT "DistrictDemandMemory_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
